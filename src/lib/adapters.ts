import { DATASET_AS_OF, DATASET_SOURCE, STOCKS, type Stock } from "./stocks";

export type AdapterStatus = "available" | "disabled" | "unavailable";

/**
 * 数据源适配器接口。真实数据源（Fuyao / iFinD）必须在服务端实现，
 * 密钥仅存于服务端环境变量，绝不下发到浏览器。
 */
export interface DataSourceAdapter {
  id: string;
  name: string;
  status: AdapterStatus;
  isSynthetic: boolean;
  description: string;
  fetchUniverse(): Promise<{ stocks: Stock[]; asOf: string; source: string }>;
}

export const syntheticAdapter: DataSourceAdapter = {
  id: "synthetic", name: "合成演示数据集", status: "available", isSynthetic: true,
  description: "内置 11 只虚构股票，数值为人工构造，用于演示规则与筛选逻辑。",
  fetchUniverse: async () => ({ stocks: STOCKS, asOf: DATASET_AS_OF, source: DATASET_SOURCE }),
};

const notConnected = (name: string) => async (): Promise<never> => {
  throw new Error(`${name} 适配器尚未接入：需在服务端配置授权与密钥后启用。当前不会返回任何数据。`);
};

export const fuyaoAdapter: DataSourceAdapter = {
  id: "fuyao", name: "Fuyao 数据接口", status: "disabled", isSynthetic: false,
  description: "预留接口，未接入。接入需服务端函数 + 服务端密钥，浏览器端不保存任何 API Key。",
  fetchUniverse: notConnected("Fuyao"),
};

export const ifindAdapter: DataSourceAdapter = {
  id: "ifind", name: "同花顺 iFinD", status: "unavailable", isSynthetic: false,
  description: "预留接口，未接入，未获得授权。不会展示任何真实行情或价格。",
  fetchUniverse: notConnected("iFinD"),
};

export const ADAPTERS = [syntheticAdapter, fuyaoAdapter, ifindAdapter];