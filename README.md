# StockLens AI — 自然语言智能选股与策略解释器

> **合成数据演示；非真实行情、非投资建议。**

## 公开演示（GitHub Pages）

预期访问地址：**https://mingzior.github.io/nlpStockWithStreategy/**

该地址须先在 GitHub 仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions** 开启 Pages，并以 Actions 部署成功为准。**未部署成功前不代表链接可用。**

无需 Lovable，无需金融 API 密钥。静态应用位于 [docs/index.html](docs/index.html)，不包含扶摇/iFinD 的服务端调用。

## 已实现的静态演示功能

- 中文自然语言条件解析，生成可见、可编辑的结构化规则
- 自定义指标、运算符、阈值、区间；矛盾与无效条件阻止运行
- 11 只**虚构**股票的确定性规则筛选，逐项通过/未通过/缺失解释
- 数据来源、指标单位、口径和模拟日期说明
- 入选/排除/未知状态筛选，修改规则后的结果变化摘要
- 2–4 只股票的指标对比表
- 浏览器本地策略保存、载入、删除
- 手机端响应式布局；无需登录即可交互

## 运行与开发

原始完整应用为 TanStack Start + React，包含独立的服务端真实数据适配器：

```bash
npm install
npm test
npm run build
npm run dev
```

静态版：直接打开 `docs/index.html`，或使用任意静态 HTTP 服务器托管 `docs/`。

## 数据与安全边界

静态演示**不连接**扶摇或 iFinD，不会向第三方发送查询或暴露 API 凭据。真实数据能力保留在原始服务端项目中，部署后仍需要密钥、权限控制、限流及端到端验证。GitHub Pages 不能执行 `/api/screen` 或 `/api/fuyao`。

## 测试与发布

- `.github/workflows/ci.yml`：React 主应用单元测试与构建。
- `.github/workflows/pages.yml`：校验静态文件和 JS 语法，上传并发布到 GitHub Pages。
- `src/test/real-data.test.ts`：模拟上游响应验证真实 PE/PB 适配器的缺失值和失败处理（非真实接口测试）。

如 Pages workflow 提示 `Get Pages site failed: Not Found`，需由仓库管理员先在 Settings → Pages 开启 GitHub Actions 作为发布源。

## 课程交付说明

该版本满足**无实时金融 API**的产品演示范围；不包含真实股票行情、实时监控、历史回测或在线用户账号系统。所有合成数据都明确标注，不用于投资决策。
