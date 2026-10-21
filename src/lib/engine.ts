import { METRICS, type MetricKey, type Stock } from "./stocks";

export type Op = ">=" | "<=" | ">" | "<" | "between";
export const OPS: { value: Op; label: string }[] = [
  { value: ">=", label: "≥" }, { value: ">", label: ">" }, { value: "<=", label: "≤" }, { value: "<", label: "<" }, { value: "between", label: "介于" },
];

export interface Rule {
  id: string;
  metric: MetricKey;
  op: Op;
  value: number;
  value2?: number;
  origin: string; // 来源短语，用于可追溯
}

export interface ParseNote { kind: "info" | "ambiguous" | "unrecognized"; text: string }
export interface ParseResult { rules: Rule[]; notes: ParseNote[] }

let seq = 0;
const rid = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
const R = (metric: MetricKey, op: Op, value: number, origin: string, value2?: number): Rule => ({ id: rid(), metric, op, value, value2, origin });

interface Concept { words: string[]; build: (w: string) => Rule[]; note?: string }

const CONCEPTS: Concept[] = [
  { words: ["经营改善", "业绩改善", "基本面改善"], build: (w) => [R("revenue_growth", ">=", 10, w), R("net_profit_growth", ">=", 10, w)], note: "“经营改善”解释为营收与净利润同比增长均 ≥10%" },
  { words: ["高成长", "高增长", "快速增长"], build: (w) => [R("revenue_growth", ">=", 25, w)], note: "“高成长”解释为营收同比 ≥25%" },
  { words: ["盈利能力强", "高ROE", "高roe", "赚钱能力强"], build: (w) => [R("roe", ">=", 15, w)] },
  { words: ["估值合理", "估值适中"], build: (w) => [R("pe", "between", 8, w, 30)], note: "“估值合理”为主观表述，默认解释为 PE 介于 8–30 倍，请按需编辑" },
  { words: ["低估值", "便宜", "估值低"], build: (w) => [R("pe", "<=", 15, w), R("pb", "<=", 2, w)] },
  { words: ["高估值", "估值高"], build: (w) => [R("pe", ">=", 40, w)] },
  { words: ["走势稳定", "波动小", "低波动", "走势平稳"], build: (w) => [R("volatility_60d", "<=", 30, w), R("max_drawdown_1y", "<=", 25, w)], note: "“走势稳定”解释为 60日波动率 ≤30% 且近1年最大回撤 ≤25%" },
  { words: ["高波动", "波动大"], build: (w) => [R("volatility_60d", ">=", 40, w)] },
  { words: ["低负债", "负债低", "财务稳健"], build: (w) => [R("debt_ratio", "<=", 50, w)] },
  { words: ["高毛利", "毛利率高"], build: (w) => [R("gross_margin", ">=", 40, w)] },
];

const AMBIGUOUS = ["好公司", "优质", "龙头", "有潜力", "值得买", "靠谱", "白马"];

const METRIC_ALIASES: [RegExp, MetricKey][] = [
  [/^(PE|市盈率)$/i, "pe"], [/^(PB|市净率)$/i, "pb"], [/^ROE$/i, "roe"], [/^毛利率$/, "gross_margin"],
  [/^(负债率|资产负债率)$/, "debt_ratio"], [/^(营收增长|营收增速)$/, "revenue_growth"], [/^(净利润增长|利润增速)$/, "net_profit_growth"],
  [/^波动率$/, "volatility_60d"], [/^(回撤|最大回撤)$/, "max_drawdown_1y"],
];
const OP_ALIASES: Record<string, Op> = { ">=": ">=", "≥": ">=", "不低于": ">=", "至少": ">=", "<=": "<=", "≤": "<=", "不高于": "<=", "不超过": "<=", ">": ">", "大于": ">", "高于": ">", "<": "<", "小于": "<", "低于": "<" };
const NUM_RE = /(PE|PB|ROE|市盈率|市净率|毛利率|资产负债率|负债率|营收增长|营收增速|净利润增长|利润增速|波动率|最大回撤|回撤)\s*(>=|<=|≥|≤|>|<|不低于|不高于|不超过|至少|大于|小于|高于|低于)\s*(-?\d+(?:\.\d+)?)\s*%?/i;

/** 确定性关键词解析器（非 LLM）。相同输入永远得到相同规则。 */
export function parseQuery(input: string): ParseResult {
  const rules: Rule[] = [];
  const notes: ParseNote[] = [];
  const text = input.trim();
  if (!text) return { rules, notes: [{ kind: "info", text: "请输入选股描述，例如：经营改善、估值合理、走势稳定" }] };
  const parts = text.split(/[，,、；;。\s]+|并且|而且|同时|且|和/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    let matched = false;
    const num = part.match(NUM_RE);
    if (num) {
      const metric = METRIC_ALIASES.find(([re]) => re.test(num[1]))?.[1];
      const op = OP_ALIASES[num[2]];
      if (metric && op) { rules.push(R(metric, op, Number(num[3]), part)); matched = true; }
    }
    for (const c of CONCEPTS) {
      const w = c.words.find((x) => part.includes(x));
      if (w) { rules.push(...c.build(w)); if (c.note) notes.push({ kind: "info", text: c.note }); matched = true; }
    }
    const amb = AMBIGUOUS.find((a) => part.includes(a));
    if (amb) { notes.push({ kind: "ambiguous", text: `“${amb}”含义不明确，未转换为规则。请具体说明，例如“ROE≥15”或“营收增长≥20”` }); matched = true; }
    if (!matched) notes.push({ kind: "unrecognized", text: `未能识别“${part}”，已忽略。可使用示例词或“指标 运算符 数值”格式（如 PE<20）` });
  }
  return { rules, notes };
}

export interface Conflict { metric: MetricKey; message: string; ruleIds: string[] }

/** 检测规则问题：数值非法、区间倒置、同一指标多条规则区间无交集。 */
export function detectConflicts(rules: Rule[]): Conflict[] {
  const out: Conflict[] = [];
  const byMetric = new Map<MetricKey, Rule[]>();
  for (const r of rules) {
    if (!Number.isFinite(r.value) || (r.op === "between" && !Number.isFinite(r.value2 ?? NaN))) {
      out.push({ metric: r.metric, message: `${METRICS[r.metric].label} 的阈值不是有效数字`, ruleIds: [r.id] });
      continue;
    }
    if (r.op === "between" && (r.value2 as number) < r.value) {
      out.push({ metric: r.metric, message: `${METRICS[r.metric].label} 区间下限 ${r.value} 大于上限 ${r.value2}`, ruleIds: [r.id] });
      continue;
    }
    byMetric.set(r.metric, [...(byMetric.get(r.metric) ?? []), r]);
  }
  for (const [metric, rs] of byMetric) {
    if (rs.length < 2) continue;
    let lo = -Infinity, loStrict = false, hi = Infinity, hiStrict = false;
    for (const r of rs) {
      const lower = r.op === ">=" || r.op === ">" || r.op === "between" ? r.value : null;
      const upper = r.op === "<=" || r.op === "<" ? r.value : r.op === "between" ? (r.value2 as number) : null;
      if (lower !== null && (lower > lo || (lower === lo && r.op === ">"))) { lo = lower; loStrict = r.op === ">"; }
      if (upper !== null && (upper < hi || (upper === hi && r.op === "<"))) { hi = upper; hiStrict = r.op === "<"; }
    }
    if (lo > hi || (lo === hi && (loStrict || hiStrict))) {
      out.push({ metric, message: `${METRICS[metric].label} 的条件互相矛盾（要求 ${loStrict ? ">" : "≥"}${lo} 且 ${hiStrict ? "<" : "≤"}${hi}），不可能同时满足`, ruleIds: rs.map((r) => r.id) });
    }
  }
  return out;
}

export type Status = "included" | "excluded" | "unknown";
export interface RuleCheck { rule: Rule; value: number | null; result: "pass" | "fail" | "missing"; reason: string }
export interface StockResult { stock: Stock; status: Status; checks: RuleCheck[] }

export function ruleText(r: Rule): string {
  const d = METRICS[r.metric];
  const sym = OPS.find((o) => o.value === r.op)?.label;
  return r.op === "between" ? `${d.label} 介于 ${r.value}–${r.value2}${d.unit}` : `${d.label} ${sym} ${r.value}${d.unit}`;
}

function passes(v: number, r: Rule): boolean {
  switch (r.op) {
    case ">=": return v >= r.value;
    case ">": return v > r.value;
    case "<=": return v <= r.value;
    case "<": return v < r.value;
    case "between": return v >= r.value && v <= (r.value2 as number);
  }
}

/** 确定性筛选。缺失值永远不算通过：任一规则失败 → 排除；无失败但有缺失 → 未知；全部通过 → 入选。 */
export function runScreen(stocks: Stock[], rules: Rule[]): StockResult[] {
  return stocks.map((stock) => {
    const checks: RuleCheck[] = rules.map((rule) => {
      const v = stock.metrics[rule.metric];
      const d = METRICS[rule.metric];
      if (v === null || v === undefined || !Number.isFinite(v)) {
        return { rule, value: null, result: "missing", reason: `数据缺失：${stock.missingNote?.[rule.metric] ?? "无可用值"}，不视为通过` };
      }
      const ok = passes(v, rule);
      return { rule, value: v, result: ok ? "pass" : "fail", reason: `${d.label} = ${v}${d.unit}，${ok ? "满足" : "不满足"}「${ruleText(rule)}」` };
    });
    const status: Status = checks.some((c) => c.result === "fail") ? "excluded" : checks.some((c) => c.result === "missing") ? "unknown" : "included";
    return { stock, status, checks };
  });
}

export interface Impact {
  addedRules: string[]; removedRules: string[]; changedRules: string[];
  changes: { code: string; name: string; from: Status; to: Status }[];
  before: Record<Status, number>; after: Record<Status, number>;
}

const count = (rs: StockResult[]) => ({ included: rs.filter((r) => r.status === "included").length, excluded: rs.filter((r) => r.status === "excluded").length, unknown: rs.filter((r) => r.status === "unknown").length });

export function computeImpact(prevRules: Rule[], prev: StockResult[], nextRules: Rule[], next: StockResult[]): Impact {
  const pm = new Map(prevRules.map((r) => [r.id, r]));
  const nm = new Map(nextRules.map((r) => [r.id, r]));
  const addedRules = nextRules.filter((r) => !pm.has(r.id)).map(ruleText);
  const removedRules = prevRules.filter((r) => !nm.has(r.id)).map(ruleText);
  const changedRules = nextRules.filter((r) => pm.has(r.id) && ruleText(pm.get(r.id)!) !== ruleText(r)).map((r) => `${ruleText(pm.get(r.id)!)} → ${ruleText(r)}`);
  const prevStatus = new Map(prev.map((r) => [r.stock.code, r.status]));
  const changes = next.filter((r) => prevStatus.has(r.stock.code) && prevStatus.get(r.stock.code) !== r.status).map((r) => ({ code: r.stock.code, name: r.stock.name, from: prevStatus.get(r.stock.code)!, to: r.status }));
  return { addedRules, removedRules, changedRules, changes, before: count(prev), after: count(next) };
}

export const STATUS_LABEL: Record<Status, string> = { included: "入选", excluded: "排除", unknown: "未知（数据缺失）" };