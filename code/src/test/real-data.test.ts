import { afterEach, describe, expect, it, vi } from "vitest";
import { fuyaoAdapter } from "../lib/adapters";
import { runScreen, type Rule } from "../lib/engine";

afterEach(() => vi.unstubAllGlobals());

describe("Fuyao live adapter: no fabricated indicators", () => {
  it("evaluates PE and treats unavailable ROE as missing", async () => {
    const response = (kind: string) => ({
      ok: true,
      json: async () => ({
        mode: "real", receivedAt: "2026-10-21T00:00:00Z", sourceTimestamp: null,
        items: kind === "valuations"
          ? [{ thscode: "600519.SH", name: "真实数据测试证券", pe_ttm: 22, pb_mrq: 5 }]
          : [{ thscode: "600519.SH", name: "真实数据测试证券" }],
      }),
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => response(new URL(url, "http://localhost").searchParams.get("kind") ?? "")));
    const { stocks, asOf } = await fuyaoAdapter.fetchUniverse();
    expect(stocks[0].metrics.pe).toBe(22);
    expect(stocks[0].metrics.roe).toBeNull();
    expect(asOf).toContain("未知");
    const rules: Rule[] = [
      { id: "pe", metric: "pe", op: "<", value: 30, origin: "PE<30" },
      { id: "roe", metric: "roe", op: ">", value: 15, origin: "ROE>15" },
    ];
    const [result] = runScreen(stocks, rules);
    expect(result.status).toBe("unknown");
    expect(result.checks.map(c => c.result)).toEqual(["pass", "missing"]);
  });
  it("rejects API failure rather than falling back to synthetic", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429, json: async () => ({message:"rate limited"}) })));
    await expect(fuyaoAdapter.fetchUniverse()).rejects.toThrow();
  });
});
