# AI 使用与验证记录

更新：2026-10-21。本记录严格区分开发辅助 AI、实际运行时 AI、确定性引擎和金融数据工具。

## AI 工具及参与环节
- **Lovable / AI Coding**：早期 React/TanStack Start 原型与页面初稿，辅助生成代码、规则引擎和文档。
- **ChatGPT + GitHub 连接**：代码审查、静态页面交互修改、API 数据适配、自动化测试、监控工作流和交付文档。
- **OpenAI API（仅 React 服务端原型）**：`code/src/routes/api/intent.ts` 可调用 LLM 生成结构化候选规则及澄清问题，经过 Schema 校验；**公开 Pages 未部署此 API**。
- **GitHub Actions、Playwright、Vitest、Python unittest**：验证与自动部署工具，不属于 LLM。

## AI 输出/方案 → 问题 → 人工修正 → 可核查验证

| AI 生成或早期方案 | 审查发现的问题 | 修改方案 | 验证证据及状态 |
| --- | --- | --- | --- |
| 早期静态演示使用 11 只 SYN 股票 | 合成数据可能被误解为真实金融结论 | 改为扶摇 PE/PB 真实快照；失败时禁用筛选 | [快照原文](code/site/data/stocks.json)、[抓取脚本](scripts/fetch_fuyao_snapshot.py)；真实数据值由提供方返回，尚需原库逐条核实 |
| 关键词解析被理解为 AI 语义理解 | 关键词匹配不能代表 LLM 理解 | 明确区分 216 条人工模板和 React 服务端 LLM 接口 | [静态前端](code/site/index.html)、[LLM 接口](code/src/routes/api/intent.ts)；静态站未部署 LLM |
| 对缺失 ROE 等指标可能形成入选结论 | 缺失不应视为通过 | 使用 pass/fail/missing 三态；失败优先于缺失 | [监控测试](tests/test_monitor.py)、[引擎测试](code/src/test/engine.test.ts) |
| 初始筛选卡片将规则说明和证据直接展示 | 用户要求点击按钮才展开，旧浏览器测试也仍检查合成数据 | 增加「参考」「入选依据」「排除依据」折叠交互；更新 Playwright 断言 | [浏览器测试源码](code/e2e/tests/stocklens.spec.cjs)、[测试工作流](https://github.com/Mingzior/nlpStockWithStreategy/actions/workflows/e2e.yml) |
| 导出监控 JSON 被误当作监控已启动 | 导出文件不能在后台执行 | 新增 GitHub Actions 定时刷新、策略重筛、状态变化记录；前端单独展示最近执行结果 | [监控引擎](scripts/run_monitor.py)、[监控工作流](.github/workflows/refresh-financial-data.yml)；需首次成功运行验证 |
| iFinD 的自然语言指标回答可能被当作已核验数值 | 缺少稳定的结构化证券代码、财报期、单位、可核查原文 | 添加结构化字段与来源验证器；拒绝自由文本自动填入 ROE/增长率/负债率 | [iFinD 候选字段验证](scripts/validate_ifind_observations.py)；**四项指标仍未接入真实快照** |
| README 和测试文档描述仍为旧合成数据版 | 交付物与现有真实数据网页相矛盾 | 同步 README、AI 使用记录、测试说明、Web URL 文档 | [README](README.md)；文档变更不等于全部功能完成 |

以上记录是对可查代码与项目修改的复盘，不声称保存了每次 AI 的逐字原始输出或每次人工决策时间戳。若评审要求逐字 Prompt/Response 日志，仍需补充经脱敏的会话记录与对应 commit。

## 职责边界
- AI 仅能澄清和建议候选规则；用户负责确认阈值。
- 确定性引擎负责入选/排除/未知判定与规则变化分析。
- 金融数据工具提供可追溯事实，不能由 LLM 补造。
- 原数据库逐证券记录 URL 未核实，官方字段文档不等于个股原始数值证据。

## 已知限制
公开 Pages 没有运行时 LLM；只有 PE/PB 两项验证字段；监控需 Actions 首次成功运行；无历史回测或消息通知。 [测试说明](测试说明.md) · [溯源说明](docs/TESTING_AND_PROVENANCE.md)。
