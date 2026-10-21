import { z } from "zod";
import { METRICS } from "./stocks";
import { detectConflicts, runScreen, type Rule } from "./engine";
import type { Stock } from "./stocks";

/** The model may propose only; never execute model-provided code or SQL. */
export const proposalSchema = z.object({
  intents: z.array(z.object({ phrase: z.string().max(100), meaning: z.string().max(300), uncertainty: z.string().max(300).optional() })).max(8),
  rules: z.array(z.object({
    metric: z.enum(["revenue_growth","net_profit_growth","roe","gross_margin","pe","pb","debt_ratio","volatility_60d","max_drawdown_1y"]),
    op: z.enum([">=",">","<=","<","between"]),
    value: z.number().finite(), value2: z.number().finite().optional(),
    origin: z.string().max(160), rationale: z.string().max(300),
    isHardConstraint: z.boolean().default(false),
  })).max(20),
  clarifications: z.array(z.string().max(200)).max(8),
}).strict();

export type Proposal = z.infer<typeof proposalSchema>;
export type Compiled = { version: 1; rules: Rule[]; warnings: string[] };
export function compileProposal(input: unknown): Compiled {
  const p=proposalSchema.parse(input);
  const warnings: string[]=[];
  const rules: Rule[]=p.rules.map((r,i)=>{
    const metric=METRICS[r.metric];
    if (!metric) throw new Error("invalid_metric");
    if (r.op==="between" && (r.value2===undefined||r.value2<r.value)) throw new Error("invalid_interval");
    if (r.op!=="between" && r.value2!==undefined) throw new Error("unexpected_second_value");
    return {id:"ir"+i,metric:r.metric,op:r.op,value:r.value,value2:r.value2,origin:r.origin+"（AI建议，需用户确认）"};
  });
  const conflicts=detectConflicts(rules);
  if(conflicts.length)throw new Error("conflicting_rules: "+conflicts.map(x=>x.message).join("; "));
  if(!rules.length)warnings.push("没有可执行的规则，请澄清意图");
  if(p.clarifications.length)warnings.push("存在待澄清意图，请确认是否适用");
  return {version:1,rules,warnings};
}
export function executeConfirmedIR(ir: Compiled,stocks:Stock[],confirmed:boolean){
  if(!confirmed)throw new Error("user_confirmation_required");
  if(!ir.rules.length)throw new Error("empty_rules");
  if(detectConflicts(ir.rules).length)throw new Error("invalid_ir");
  const rank={included:0,unknown:1,excluded:2};
  return runScreen(stocks,ir.rules).sort((a,b)=>rank[a.status]-rank[b.status]||b.checks.filter(c=>c.result==="pass").length-a.checks.filter(c=>c.result==="pass").length||a.stock.code.localeCompare(b.stock.code));
}
