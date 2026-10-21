// 合成演示数据 —— 全部为虚构公司与虚构数值，非真实行情，不可用于任何投资决策。
export const DATASET_LABEL = "合成演示数据，非真实行情";
export const DATASET_AS_OF = "2026-09-30"; // 合成快照日期（虚构）
export const DATASET_SOURCE = "StockLens 内置合成数据集 v1（synthetic）";

export type MetricKey =
  | "revenue_growth"
  | "net_profit_growth"
  | "roe"
  | "gross_margin"
  | "pe"
  | "pb"
  | "debt_ratio"
  | "volatility_60d"
  | "max_drawdown_1y";

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  definition: string;
  period: string;
}

export const METRICS: Record<MetricKey, MetricDef> = {
  revenue_growth: { key: "revenue_growth", label: "营收同比增长", unit: "%", definition: "最近报告期营业收入相对上年同期的增长率", period: "TTM 同比" },
  net_profit_growth: { key: "net_profit_growth", label: "净利润同比增长", unit: "%", definition: "最近报告期归母净利润相对上年同期的增长率", period: "TTM 同比" },
  roe: { key: "roe", label: "ROE", unit: "%", definition: "净资产收益率 = 归母净利润 / 平均归母净资产", period: "TTM" },
  gross_margin: { key: "gross_margin", label: "毛利率", unit: "%", definition: "(营业收入 − 营业成本) / 营业收入", period: "TTM" },
  pe: { key: "pe", label: "市盈率 PE", unit: "倍", definition: "合成市值 / TTM 归母净利润；亏损时记为缺失", period: "快照日" },
  pb: { key: "pb", label: "市净率 PB", unit: "倍", definition: "合成市值 / 最新归母净资产", period: "快照日" },
  debt_ratio: { key: "debt_ratio", label: "资产负债率", unit: "%", definition: "总负债 / 总资产", period: "最新报告期" },
  volatility_60d: { key: "volatility_60d", label: "60日年化波动率", unit: "%", definition: "近60个交易日日收益率标准差 × √252（合成序列）", period: "近60交易日" },
  max_drawdown_1y: { key: "max_drawdown_1y", label: "近1年最大回撤", unit: "%", definition: "近250个交易日内从高点到低点的最大跌幅（正数表示）", period: "近1年" },
};

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

export interface Stock {
  code: string;
  name: string;
  industry: string;
  metrics: Record<MetricKey, number | null>;
  missingNote?: Partial<Record<MetricKey, string>>;
}

const m = (
  revenue_growth: number | null, net_profit_growth: number | null, roe: number | null, gross_margin: number | null,
  pe: number | null, pb: number | null, debt_ratio: number | null, volatility_60d: number | null, max_drawdown_1y: number | null,
): Record<MetricKey, number | null> => ({ revenue_growth, net_profit_growth, roe, gross_margin, pe, pb, debt_ratio, volatility_60d, max_drawdown_1y });

export const STOCKS: Stock[] = [
  { code: "SYN-001", name: "澄川精密（虚构）", industry: "高端制造", metrics: m(18.4, 22.1, 16.8, 34.2, 21.5, 3.1, 38.5, 24.6, 18.2) },
  { code: "SYN-002", name: "蓝岸医疗（虚构）", industry: "医疗器械", metrics: m(26.7, 31.5, 19.4, 62.8, 34.8, 5.6, 22.1, 29.8, 21.4) },
  { code: "SYN-003", name: "北辰能源（虚构）", industry: "公用事业", metrics: m(4.2, 6.8, 11.2, 28.5, 11.3, 1.2, 61.4, 15.2, 9.8) },
  { code: "SYN-004", name: "知微软件（虚构）", industry: "软件服务", metrics: m(32.5, null, 8.1, 71.4, null, 7.8, 18.6, 46.3, 38.7), missingNote: { net_profit_growth: "上年同期净利润为负，增长率无意义", pe: "TTM 亏损，PE 不适用" } },
  { code: "SYN-005", name: "松禾食品（虚构）", industry: "食品饮料", metrics: m(12.1, 14.6, 22.5, 45.3, 26.4, 5.2, 29.7, 19.4, 14.1) },
  { code: "SYN-006", name: "曜石材料（虚构）", industry: "化工材料", metrics: m(-8.4, -21.3, 6.2, 18.9, 14.7, 0.9, 52.8, 36.1, 33.5) },
  { code: "SYN-007", name: "远帆物流（虚构）", industry: "交通运输", metrics: m(9.6, 11.8, 12.4, null, 13.9, 1.6, 48.2, null, 16.7), missingNote: { gross_margin: "合成数据集中该期未披露", volatility_60d: "停牌期间行情序列不完整" } },
  { code: "SYN-008", name: "云栖半导体（虚构）", industry: "半导体", metrics: m(41.2, 55.6, 14.3, 48.7, 58.2, 6.9, 33.4, 52.7, 44.9) },
  { code: "SYN-009", name: "安澜银行（虚构）", industry: "银行", metrics: m(3.1, 4.5, 10.8, null, 5.2, 0.6, 91.5, 13.6, 11.2), missingNote: { gross_margin: "银行业不适用毛利率口径" } },
  { code: "SYN-010", name: "青禾家居（虚构）", industry: "家居消费", metrics: m(14.8, 10.2, 15.6, 36.4, 17.8, 2.4, 41.3, 22.9, 19.6) },
  { code: "SYN-011", name: "星衡电子（虚构）", industry: "消费电子", metrics: m(11.3, 16.9, 13.1, 24.6, 23.1, 2.8, 55.2, 31.4, 27.3) },
];