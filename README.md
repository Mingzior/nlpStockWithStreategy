# StockLens AI · 自然语言智能选股与策略解释器

**[在线 Web 产品](https://mingzior.github.io/nlpStockWithStreategy/)** · [源代码](https://github.com/Mingzior/nlpStockWithStreategy) · [AI 使用与验证记录](AI使用与验证记录.md) · [测试说明](测试说明.md) · [可追溯性验收](docs/TESTING_AND_PROVENANCE.md)

> 公开网页使用 **扶摇真实估值 API 的定期静态快照**，不是实时行情或投资建议。当前预设 5 只 A 股，已验证映射仅 PE(TTM) 和 PB(MRQ)，其余七项指标缺失。静态网页**没有运行时 LLM**；216 条自然语言查询为人工整理的候选模板。

## 1. 产品与可操作主链路

自然语言输入 → 关键词/模板生成候选规则 → 用户编辑并确认 → 规则冲突检测 → 确定性引擎筛选 → 入选/排除/未知 → 点击「参考」「入选依据」「排除依据」查看解释 → 股票对比、浏览器保存、导出结果与监控配置。

[监控配置](monitor/strategies.json) 中已启用的策略由 GitHub Actions 在成功刷新真实快照后自动重新筛选并记录变化。点击网页「查看最近监控结果」可读取 [监控记录](code/site/data/monitor-history.json)。**导出监控配置不会自动启用监控**；必须把规则提交到仓库并运行工作流。未实现真实历史回测、自动邮件通知或多用户云端任务管理。

## 2. 启动与部署

公开体验：直接打开 [GitHub Pages](https://mingzior.github.io/nlpStockWithStreategy/)。

本地静态页：
```bash
python -m http.server 8000 --directory code/site
# 打开 http://localhost:8000/
```

本地 React/TanStack Start 服务端原型（与公开静态站不同）：
```bash
cd code
npm install
npm run dev
npm test
npm run build
```

Python 数据/监控测试：
```bash
python -m unittest discover -s tests -p 'test_*.py' -v
```

浏览器端到端测试：
```bash
cd code/e2e
npm install
npx playwright install chromium
npm test
```

## 3. 环境变量和密钥

| 变量 | 用途 | 位置 |
| --- | --- | --- |
| `FUYAO_API_KEY` | 获取扶摇估值和价格快照 | GitHub Actions Secret / 本地环境 |
| `IFIND_MCP_AUTHORIZATION` | iFinD MCP API 验证与未来补充指标 | GitHub Actions Secret；**未作为公开快照指标源** |
| `OPENAI_API_KEY` | React 服务端原型的真实 LLM 候选规则生成 | Node 服务端；**GitHub Pages 不使用** |
| `OPENAI_MODEL` | 可选 LLM 模型名 | Node 服务端 |

密钥不能写进前端、仓库、公开 JSON 或 URL；配置示例见 [code/.env.example](code/.env.example)。

## 4. AI、确定性引擎、金融数据工具的边界

- **AI 候选生成权**：ChatGPT/Lovable 用于产品研发、代码与测试辅助；运行时 LLM 仅在未部署的 React 服务端原型 `code/src/routes/api/intent.ts` 中实现，负责澄清和候选规则，不负责判定股票。
- **确定性引擎判定权**：`code/site/index.html` 的筛选器与 `scripts/run_monitor.py` 的监控引擎依据明确指标、阈值和缺失规则执行，不让 AI 宣布入选。
- **金融数据工具事实权**：`scripts/fetch_fuyao_snapshot.py` 调用扶摇 API 并将 PE/PB 映射为公开快照；其他指标缺失不能补造。iFinD 已有接口验证工作流，但 **ROE、营收同比、净利润同比、资产负债率尚未形成已验证的结构化记录**。候选数据结构校验见 `scripts/validate_ifind_observations.py`。

## 5. 数据来源、口径与可追溯性

- [公开真实快照 JSON](code/site/data/stocks.json)：`fetchedAt` 为抓取时间，`asOf` 为上游原始时点；两者不可混淆。
- [扶摇估值 API 文档](https://fuyao.aicubes.cn/docs/api-reference/valuations/)：PE 使用 `pe_ttm`，PB 使用 `pb_mrq`，数值单位为倍。
- 新版采集脚本会保留 `sourceRecord` 原文字段；**旧版已发布快照可能尚未包含它，须待下一次刷新**。
- 原始供应商逐证券数据库记录的公开直达 URL **尚未验证**；网页提供的是可点击的公开快照副本及字段文档，不能将官方接口文档冒充某只股票的原始记录。
- 所有筛选结果仅反映这 5 只预设股票在快照中的条件匹配，不是全市场结果或收益预测。

## 6. 真实监控任务

[刷新与监控工作流](.github/workflows/refresh-financial-data.yml) 周一至周五 UTC 02:20 定时执行，也可手动运行：刷新扶摇数据 → 执行已启用策略 → 生成 `code/site/data/monitor-history.json` → 提交数据与监控结果 → 发布 Pages。

在 [monitor/strategies.json](monitor/strategies.json) 中配置 `id`、`name`、`enabled: true`、`rules`。例如 `{"metric":"pe","op":"<=","value":25}`。修改规则后，监控结果以新基线计算，**不会把规则变化误报为股票状态变化**。失败时不回退虚构数据。浏览器保存的策略只在 localStorage 中，不会自动上传 GitHub。

## 7. 已知限制与未完成

1. 公开静态网页不是实时 LLM，任意复杂自然语言不保证理解；需要服务端部署才可打通真实 LLM。
2. 目前仅 5 只预设股票、2 个可验证财务指标；iFinD 四项指标接入仍需原始结构、口径、时点、授权验证。
3. 无原供应商逐证券记录直达链接；公开再分发授权仍需人工核实。
4. 监控已实现定时重筛与状态变化记录，但**需 GitHub Actions 首次成功运行后才能确认线上可用**；没有自动通知或回测。
5. 历史数据未做 point-in-time 回测；未完成全面性能、无障碍、多设备与安全审计。
6. `code/src` React 服务端原型与 `code/site` 静态站是不同运行形态，不应混称。

## 8. 交付证据

[Web 产品 URL](Web产品URL.md) · [AI 使用与验证记录](AI使用与验证记录.md) · [测试说明](测试说明.md) · [测试与溯源矩阵](docs/TESTING_AND_PROVENANCE.md) · [GitHub Actions](https://github.com/Mingzior/nlpStockWithStreategy/actions)

**合规声明**：仅供课程演示和条件筛选，不提供个性化投资建议；不保证收益。数据许可及公开再分发条款需与提供方核实。
