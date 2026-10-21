# 第一阶段：纯 GitHub 的真实金融数据选股

架构：GitHub Actions（扶摇事实数据）→ `code/site/data/stocks.json`（静态快照）→ GitHub Pages（确定性筛选）。**不需要独立 Web 服务端**。

## 开启真实数据
1. 进入仓库 Settings → Secrets and variables → Actions → New repository secret。
2. 添加 `FUYAO_API_KEY`，填入**你自己授权的**扶摇 API Key。**不要**把密钥写到仓库文件、Issues、聊天或 Pages。
3. 进入 Actions → **Refresh Fuyao Static Snapshot** → Run workflow。首次成功后脚本将验证返回数据并提交 `code/site/data/stocks.json`，触发 Pages 自动重新部署。
4. 打开 https://mingzior.github.io/nlpStockWithStreategy/ ，确认数据源为“扶摇真实快照”，检查抓取时间和上游时点。
5. 之后工作流计划在工作日 UTC 02:20 运行（具体执行时间可能延迟）；不是实时行情。

## 字段与范围
目前只验证映射 `pe_ttm → pe` 和 `pb_mrq → pb`（单位：倍），预设 5 只 A 股。其余七项指标全部为 `null`，不允许推断或填补。缺失值不算通过；有失败则排除，否则缺失为未知。实际金融 API 的可用字段和权限必须以运行日志及原始响应为准。上游未提供的报告期标注为未知。

## 故障与边界
缺失密钥、API 报错、字段不匹配、没有有效 PE/PB 数据：工作流失败，不发布虚构数据。页面若没有快照，禁止筛选。若已存在旧快照，失败的刷新不会清除旧快照；请核对抓取时间，不能视为实时数据。快照文件公开可读，请确保数据服务条款允许公开展示或再分发；如不允许，不要运行该公开发布工作流。

## LLM 的限制
**第一阶段并未实现实时 LLM。** 页面现有的中文解析属于确定性关键词规则，不可声称是模型理解。GitHub Actions 可离线预生成示例，但无法充当任意访客的实时安全 LLM 网关。

## 不构成投资建议
仅用于学习确定性数据筛选；不保证数据完整、时效或投资回报。
