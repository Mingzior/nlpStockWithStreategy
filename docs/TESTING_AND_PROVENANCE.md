# StockLens 第一阶段：测试与可追溯性验收说明

## 1. 证据分级（必须区分）

| 证据级别 | 可点击地址 | 证明范围 | 不能证明 |
| --- | --- | --- | --- |
| A：公开快照中的实际字段 | [GitHub 真实 JSON 快照](https://github.com/Mingzior/nlpStockWithStreategy/blob/main/code/site/data/stocks.json) | 公开记录的股票代码、PE/PB、获取时点；新版 `sourceRecord` 保留上游响应中的对应原文字段 | 无法独立证明上游提供者未发生修订；不是上游原数据库页面 |
| B：上游官方字段文档 | [扶摇估值 API 官方文档](https://fuyao.aicubes.cn/docs/api-reference/valuations/) | 接口用途、字段含义、调用方式 | 不能证明某只股票某日的具体 PE/PB 数值 |
| C：采集过程 | [刷新工作流](https://github.com/Mingzior/nlpStockWithStreategy/actions/workflows/refresh-financial-data.yml) 和 [采集源码](https://github.com/Mingzior/nlpStockWithStreategy/blob/main/scripts/fetch_fuyao_snapshot.py) | 抓取、字段映射、校验、公开提交的流程 | 不等同于原数据库逐条记录 |
| D：人工规则建议 | [216 条查询映射](https://github.com/Mingzior/nlpStockWithStreategy/blob/main/code/site/data/query-catalog.json) | 系统为何把某句话映射到某指标和阈值 | 不能证明阈值是官方标准、具有投资预测能力 |

**限制**：目前没有经过验证的“扶摇原数据库单只股票历史估值记录直达 URL”。因此界面提供可点击的**公开快照原文**、官方字段文档和采集记录，明确标注它们的不同证据能力；不伪造原库链接。若验收要求必须跳转上游数据库原记录，当前仍**未满足**，需要提供方支持稳定记录 URL 或允许展示可公开访问的原始查询记录。

## 2. 关键数字和结论的溯源规范

- 股票 PE/PB：直接显示 `stocks.json` 中对应 `stocks[].metrics.pe/pb`；新版快照同时存 `sourceRecord.pe_ttm/pb_mrq`，支持逐值核对。PE 为 TTM，PB 为 MRQ；不添加未经验证的财报日期。
- 抓取时间：`fetchedAt` 是 GitHub Actions 收到响应的 UTC 时间；`asOf` 为原始上游时点字段，不能与抓取时间混为一谈。可能存在缓存、交易所延迟。
- “5 只”：仅指本次快照的记录数量；不代表市场全部股票、推荐数量或高收益组合。
- “216 条”：语料库 `items.length`；不等于 216 种独立金融指标，实际覆盖九种指标。
- 入选、排除、未知：本地确定性规则引擎的**条件匹配结论**，不等于投资建议；缺失数据不能当作通过。
- 修改影响：比较同一份快照在两套规则下的状态变化，不是收益回测、未来价格变化或因果效应。
- 人工建议阈值：只作为可编辑候选规则，必须明确来源为模板，不能引用为市场共识或事实。

## 3. 验收测试矩阵

| ID | 场景 | 操作 | 预期结果 | 自动化 |
| --- | --- | --- | --- | --- |
| P01 | 真实数据主链路 | 配置 Secret，手动运行刷新工作流 | API 校验通过，产生非 SYN 股票 JSON | Python `test_main_flow...` + Actions |
| P02 | 自然语言模板 | 在网页选择查询模板并解析 | 指标、阈值、模板编号及解释一致；可修改 | Python `test_catalog...` + 浏览器人工验收 |
| P03 | 确定性筛选 | 选择 PE ≤ 20 并运行 | PE 符合者入选，其余排除；每只显示实际值与规则 | 浏览器人工验收 |
| P04 | 缺失数据 | 选择 ROE ≥ 12% | 无 ROE 真实数据时标记未知，不算入选 | Python `test_main_flow...` + 浏览器人工验收 |
| P05 | 修改影响 | PE ≤ 20 改为 PE ≤ 25 后重新筛选 | 对比前后状态变化、数量及解释 | 浏览器人工验收 |
| P06 | 矛盾规则 | 同时设 PE ≤ 10、PE ≥ 30 | 冲突提示并阻止执行 | 浏览器人工验收 |
| D01 | 密钥缺失 | `FUYAO_API_KEY` 为空 | 失败且不请求接口，不生成合成数据 | Python `test_no_key...` |
| D02 | API 返回鉴权错误 | 模拟 `code=403` | 失败且不发布伪造快照 | Python `test_api_error...` |
| D03 | 数据类型异常 | PE 为字符串、PB 为 NaN | 不把异常值转换为有效估值 | Python `test_missing...` |
| D04 | 非法证券代码 | 所有返回代码不在指定股票池 | 拒绝生成快照 | Python `test_invalid_universe...` |
| D05 | 无快照或 404 | 访问无 `stocks.json` 的页面 | 禁用筛选，显示不可用，不回退虚构股票 | 浏览器人工验收 |
| C01 | 数据可追溯 | 点击快照原文和官方字段文档 | 两者打开正确地址，且说明证据边界 | 浏览器人工验收 |
| C02 | 密钥保护 | 检查网页、JSON、仓库提交 | 不包含 `FUYAO_API_KEY` 的真实值 | 人工审核 |
| C03 | 不误导投资者 | 查看页面结论 | 不承诺收益、不声称实时行情或 LLM、不将缺失数据算通过 | 人工审核 |
| C04 | 数据授权 | 检查扶摇数据许可 | 确认公开再分发符合服务条款；否则停用公开快照 | **需人工核实，当前未确认** |
| C05 | 真实来源直达 | 点击某股票对应的原数据库记录 | **当前未实现**，不得以 API 文档链接冒充 | 未通过 |

## 4. 运行命令与验收边界

```bash
python -m unittest discover -s tests -p 'test_snapshot.py' -v
```

该命令测试纯 Python 的数据适配、异常边界和模板一致性；GitHub Actions 会自动执行。浏览器交互需另外执行人工验收或 Playwright E2E；**不能仅凭单元测试通过就声称全链路完成**。

如需严格“原始记录可追溯”，建议未来保存有授权的原始 API 响应副本及哈希，附上请求参数、接口版本、证券代码、源时间、获取时间，并建立每个指标的原文字段定位；但公开发布前必须先核实提供方的数据再分发条款。
