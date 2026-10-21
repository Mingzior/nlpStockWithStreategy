# Web 产品 URL（2026-10-21）

**公开产品**：https://mingzior.github.io/nlpStockWithStreategy/

**源代码**：https://github.com/Mingzior/nlpStockWithStreategy

**部署状态**：以 [Pages 工作流](https://github.com/Mingzior/nlpStockWithStreategy/actions/workflows/pages.yml) 和 [数据刷新/监控工作流](https://github.com/Mingzior/nlpStockWithStreategy/actions/workflows/refresh-financial-data.yml) 的最新结果为准；源码提交成功不等于最新功能已部署成功。

## 操作步骤
1. 输入自然语言，或从 216 条人工查询模板中选择。
2. 点击「解析为规则」，检查和编辑指标、运算符、阈值；冲突规则不能执行。
3. 点击「运行筛选」，查看 5 只真实 A 股快照上的入选、排除、未知结果。
4. 在股票卡片上按需点击「参考」「入选依据」「排除依据」，内容默认隐藏。
5. 勾选 2–4 只股票比较，或保存策略到浏览器。
6. 点击「查看最近监控结果」，在 [监控工作流](https://github.com/Mingzior/nlpStockWithStreategy/actions/workflows/refresh-financial-data.yml) 首次成功执行后查看历史状态变化。

## 数据与能力边界
真实扶摇快照仅验证 PE(TTM)、PB(MRQ)，其余指标缺失；非实时行情、非全市场。GitHub Pages **不调用运行时 LLM**，监控任务由仓库内 GitHub Actions 执行；导出 JSON 本身不会创建任务。历史回测和自动通知未实现。 [查看数据快照](code/site/data/stocks.json) · [查看 README](README.md)。
