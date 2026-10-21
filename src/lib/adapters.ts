import { DATASET_AS_OF, DATASET_SOURCE, STOCKS, type Stock, type MetricKey } from "./stocks";

export type AdapterStatus = "available" | "disabled" | "unavailable";
export interface DataSourceAdapter {
  id: string; name: string; status: AdapterStatus; isSynthetic: boolean; description: string;
  fetchUniverse(): Promise<{ stocks: Stock[]; asOf: string; source: string }>;
}
export const syntheticAdapter: DataSourceAdapter = {
  id: "synthetic", name: "合成演示数据集", status: "available", isSynthetic: true,
  description: "11只虚构股票，数据均为人工合成。",
  fetchUniverse: async () => ({ stocks: STOCKS, asOf: DATASET_AS_OF, source: DATASET_SOURCE }),
};

const DEFAULT_CODES = ["600519.SH", "000858.SZ", "601318.SH", "600036.SH", "000333.SZ"];
async function fuyaoRequest(kind: "prices" | "valuations", codes: string[]) {
  const params = new URLSearchParams({ kind, codes: codes.join(",") });
  const response = await fetch(`/api/fuyao?${params}`, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`扶摇真实数据请求失败：${body.message ?? body.error ?? response.status}。不会自动回退到演示数据。`);
  if (body.mode !== "real" || !Array.isArray(body.items)) throw new Error("扶摇返回结构不符合预期");
  return body;
}
const numeric = (x: unknown): number | null => typeof x === "number" && Number.isFinite(x) ? x : null;

export const fuyaoAdapter: DataSourceAdapter = {
  id: "fuyao", name: "扶摇真实数据（需服务端密钥）", status: "available", isSynthetic: false,
  description: "通过本站服务端代理查询5只预设A股的估值及行情；仅在来源明确且返回有效数值时使用PE(TTM)、PB(MRQ)，其余指标显示缺失。需服务端密钥，不回退演示数据。",
  async fetchUniverse() {
    const [valuation, prices] = await Promise.all([
      fuyaoRequest("valuations", DEFAULT_CODES), fuyaoRequest("prices", DEFAULT_CODES),
    ]);
    const priceByCode = new Map<string, Record<string, unknown>>(
      prices.items.map((p: Record<string, unknown>) => [String(p.thscode), p]),
    );
    const stocks: Stock[] = valuation.items.map((v: Record<string, unknown>) => {
      const code = String(v.thscode ?? "");
      const price = priceByCode.get(code);
      const metrics = Object.fromEntries([
        "revenue_growth", "net_profit_growth", "roe", "gross_margin", "pe", "pb",
        "debt_ratio", "volatility_60d", "max_drawdown_1y",
      ].map((k) => [k, null])) as Record<MetricKey, number | null>;
      metrics.pe = numeric(v.pe_ttm);
      metrics.pb = numeric(v.pb_mrq);
      return { code, name: String(v.name ?? price?.name ?? code), industry: "未获取行业",
        metrics, missingNote: {
          revenue_growth: "尚未接入财务指标端点", net_profit_growth: "尚未接入财务指标端点",
          roe: "尚未接入财务指标端点", gross_margin: "尚未接入财务指标端点",
          debt_ratio: "尚未接入财务指标端点", pe: "扶摇估值快照未提供有效 pe_ttm", pb: "扶摇估值快照未提供有效 pb_mrq", volatility_60d: "尚未计算历史行情波动率",
          max_drawdown_1y: "尚未计算历史最大回撤",
        } };
    });
    return { stocks, asOf: valuation.sourceTimestamp ? String(valuation.sourceTimestamp) : "未知（仅有接收时间 " + valuation.receivedAt + "）", source: "扶摇 REST API / valuations/snapshot / pe_ttm(倍) / pb_mrq(倍)；实际财报期未由该适配器核实" };
  },
};
export const ifindAdapter: DataSourceAdapter = {
  id: "ifind", name: "iFinD MCP（待验证）", status: "disabled", isSynthetic: false,
  description: "服务端已提供 /api/ifind 工具发现接口；须先配置授权并验证实际工具后，才能用于真实选股。",
  fetchUniverse: async () => { throw new Error("iFinD MCP 已实现连接发现，但尚未确认选股工具字段映射；不能执行真实筛选。"); },
};
export const ADAPTERS = [syntheticAdapter, fuyaoAdapter, ifindAdapter];
