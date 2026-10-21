import { describe, expect, it } from "vitest";
import { detectConflicts, parseQuery, runScreen, computeImpact } from "@/lib/engine";
import { STOCKS } from "@/lib/stocks";

describe("StockLens 规则引擎", () => {
  it("T1 解析 经营改善、估值合理、走势稳定 为 5 条规则", () => {
    const { rules } = parseQuery("经营改善、估值合理、走势稳定");
    expect(rules.map((r) => r.metric).sort()).toEqual(["max_drawdown_1y", "net_profit_growth", "pe", "revenue_growth", "volatility_60d"].sort());
    expect(rules.find((r) => r.metric === "pe")).toMatchObject({ op: "between", value: 8, value2: 30 });
  });
  it("T2 解析显式数值 PE<20", () => {
    expect(parseQuery("PE<20").rules[0]).toMatchObject({ metric: "pe", op: "<", value: 20 });
  });
  it("T3 模糊词给出澄清且不生成规则", () => {
    const r = parseQuery("好公司");
    expect(r.rules).toHaveLength(0);
    expect(r.notes[0].kind).toBe("ambiguous");
  });
  it("T4 低估值 + 高估值 被判定冲突", () => {
    expect(detectConflicts(parseQuery("低估值，高估值").rules).some((c) => c.metric === "pe")).toBe(true);
  });
  it("T5 缺失数据不算通过，状态为未知", () => {
    const res = runScreen(STOCKS, parseQuery("高毛利").rules);
    expect(res.find((r) => r.stock.code === "SYN-007")?.status).toBe("unknown");
    expect(res.find((r) => r.stock.code === "SYN-002")?.status).toBe("included");
  });
  it("T6 默认示例结果确定", () => {
    const res = runScreen(STOCKS, parseQuery("经营改善、估值合理、走势稳定").rules);
    expect(res.filter((r) => r.status === "included").map((r) => r.stock.code)).toEqual(["SYN-001", "SYN-005", "SYN-010"]);
  });
  it("T7 影响摘要统计状态变化", () => {
    const a = parseQuery("走势稳定").rules;
    const b = a.map((r) => (r.metric === "volatility_60d" ? { ...r, value: 20 } : r));
    const imp = computeImpact(a, runScreen(STOCKS, a), b, runScreen(STOCKS, b));
    expect(imp.changedRules).toHaveLength(1);
    expect(imp.changes.length).toBeGreaterThan(0);
  });
});