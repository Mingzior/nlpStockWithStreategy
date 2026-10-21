# StockLens AI · 自然语言智能选股与策略解释器

**[在线交互演示](https://mingzior.github.io/nlpStockWithStreategy/)** · [AI 使用与验证记录](AI使用与验证记录.md) · [测试说明](测试说明.md) · [Web 产品 URL](Web产品URL.md) · [PRD（待定）](PRD.md)

> **重要：当前公开版本使用合成数据，非真实行情，不构成投资建议。** GitHub Pages 仅运行静态演示，不运行服务端金融 API。

## 1. 启动方式

**公开体验**：打开 [GitHub Pages](https://mingzior.github.io/nlpStockWithStreategy/)，无需安装或登录。

**静态版本地启动**：下载仓库后，在仓库根目录运行 `python -m http.server 8000 --directory code/site`，访问 `http://localhost:8000/`。也可以直接打开 `code/site/index.html`。

**原始 React / TanStack Start 项目**（需要 Node.js 24 与 npm）：

```bash
cd code
npm install
npm run dev
npm test
npm run build
```

## 2. 环境变量

| 变量 | 用途 | GitHub Pages 静态版 |
|---|---|---|
| `FUYAO_API_KEY` | 扶摇 API 的服务端授权 | **不需要** |
| `IFIND_MCP_AUTHORIZATION` | iFinD MCP 服务端授权 | **不需要** |

示例见 `code/.env.example`。密钥只应存储在**服务端**环境，不能提交到 GitHub 或使用 `VITE_` 前缀注入浏览器。GitHub Actions Secrets 不会自动传给部署平台。

## 3. 产品选择

本次公开交付选择 **GitHub Pages 静态交互演示**：免费、公开、无后端依赖，聚焦可操作的规则选股主链路。保留 React/TanStack Start 服务端原型以备后续真实金融数据集成，**不将该原型宣称为已经生产部署**。当前静态页独立实现与 React 原型相同方向的主要交互，仍需完整跨实现回归测试。

## 4. AI 的角色

早期代码使用 Lovable/AI Coding 辅助生成，后续由 ChatGPT 协助检查、修改和部署。**静态产品运行时没有调用 LLM**：自然语言解析使用关键词/数值表达式规则，筛选由确定性比较算法执行，用户可以手动修改解析结果。AI 不负责直接断言股票是否入选。详细过程和修正见 [AI 使用与验证记录](AI使用与验证记录.md)。

## 5. 数据来源

- **公开静态版**：仓库内置 11 只虚构 `SYN-` 股票，指标与名称均为**合成演示数据**，模拟日期 2026-09-30，绝非真实行情。
- **服务端预留**：扶摇估值/行情 API、iFinD MCP；相关 API 连通性或模拟测试**不等于**真实财务指标已完成逐项验证。
- 筛选结果展示规则、数值、单位、模拟统计期和来源；缺失指标为“未知”，不算通过。

## 6. 已知边界

- 关键词解析覆盖有限，不是通用语义理解；模糊表达需用户澄清。
- 静态版只筛选内置 11 只虚构股票，不代表全 A 股市场。
- 保存策略仅使用浏览器 localStorage，跨设备不共享。
- 规则冲突与缺失处理可确定性执行，但**静态页尚缺完整浏览器 E2E 测试**。
- 不保证未来收益，不给出确定性涨跌预测或买卖建议。
- 实际使用金融数据前必须核对授权、来源、时点、单位、统计口径及异常处理。

## 7. 未做事项

- 真实股票历史快照的公开合规导入与逐字段核验。
- 扶摇/iFinD 在已发布 Web 站点中的实际服务端调用。
- 全市场实时筛选、自动监控任务、历史回测、账号与云端策略同步。
- 浏览器 E2E、无障碍、多设备视觉回归及正式性能测试。
- PRD 的正式需求研究与详细交互设计（[PRD 待定](PRD.md)）。

## 浏览器端到端测试

在仓库根目录执行：

```bash
cd code/e2e
npm install
npx playwright install chromium
npm test
```

GitHub Actions 的 [Browser E2E](https://github.com/Mingzior/nlpStockWithStreategy/actions/workflows/e2e.yml) 在 Chromium 中实际打开 `code/site/index.html` 的本地 HTTP 服务，模拟解析、编辑、冲突、缺失、对比、保存和无金融 API 请求。测试报告以 Actions artifact 形式保留；测试是否通过以运行结果为准。

## 仓库目录

- `code/site/index.html`：GitHub Pages 交互演示（浅色、简洁布局）。
- `code/src/`：原始 React 应用、规则引擎、服务端 API 和测试。
- `code/e2e/`：Playwright Chromium 真实浏览器交互测试。
- `.github/workflows/`：CI、Pages 发布、浏览器 E2E 与受控金融 API 验证工作流。
- 根目录：交付文档及构建必需配置。

**仓库根目录仅保留五份交付文档与 `code/`（以及 GitHub Actions 必需的隐藏 `.github/`）。** Git 历史提交和 Actions 运行日志不会因目录重组而自动消失。
