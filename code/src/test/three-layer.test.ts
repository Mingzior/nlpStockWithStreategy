import { describe,it,expect } from "vitest";
import { compileProposal,executeConfirmedIR } from "../lib/three-layer";
import { STOCKS } from "../lib/stocks";
const proposal={intents:[{phrase:"公司稳定",meaning:"经营表现稳定"}],rules:[{metric:"roe" as const,op:">=" as const,value:12,origin:"公司稳定",rationale:"盈利能力代理指标",isHardConstraint:false}],clarifications:[]};
describe("three-layer boundaries",()=>{
 it("compiles candidate rules to inspectable IR",()=>{const ir=compileProposal(proposal);expect(ir.rules[0].metric).toBe("roe");expect(ir.rules[0].origin).toContain("需用户确认")});
 it("rejects illegal fields and conflicts",()=>{
  expect(()=>compileProposal({...proposal,rules:[{...proposal.rules[0],metric:"guaranteed_profit"}]})).toThrow();
  expect(()=>compileProposal({...proposal,rules:[proposal.rules[0],{...proposal.rules[0],op:"<=" as const,value:3}]})).toThrow();
 });
 it("requires explicit user confirmation",()=>{const ir=compileProposal(proposal);expect(()=>executeConfirmedIR(ir,STOCKS,false)).toThrow("user_confirmation_required")});
 it("deterministically sorts included first and preserves evidence",()=>{
  const ir=compileProposal(proposal);const results=executeConfirmedIR(ir,STOCKS,true);
  const priority={included:0,unknown:1,excluded:2};
  expect(results.map(r=>priority[r.status])).toEqual(results.map(r=>priority[r.status]).sort((a,b)=>a-b));
  expect(results[0].checks[0].reason).toContain("ROE");
 });
});
