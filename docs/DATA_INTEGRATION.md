# 金融数据接入说明

## 当前实现
- `src/routes/api/fuyao.ts`：TanStack Start 服务端代理，读取 `process.env.FUYAO_API_KEY`，调用扶摇估值/行情快照，不返回密钥。严格校验股票代码、最多20只、10秒超时、不自动回退合成数据。
- `src/lib/adapters.ts`：前端通过同源 `/api/fuyao` 获取5只预设A股估值数据，映射 `pe_ttm` / `pb_mrq`；未接入的指标一律为 null，不能参与通过判定。
- 现有页面会把数据源标记为“已禁用”，这代表尚未完成服务器密钥配置和线上验收；用户仍可选中并尝试，失败会明确报错。

## 配置步骤
1. 在部署服务的**服务器环境变量**设置 `FUYAO_API_KEY`（不要把密钥放进 GitHub、网页或 VITE_ 变量）。
2. 重新部署 Node/TanStack Start 服务端运行环境。
3. 访问 `/api/fuyao?kind=valuations&codes=600519.SH`，检查 `mode=real`、`provider=Fuyao`、`sourceTimestamp`、`items`。
4. 用浏览器选择“扶摇真实数据”，核对缺失指标为“未知”，不被视为通过。
5. 测试无密钥、无权限、限流、超时、无数据等情况。

## iFinD SKILL 安装
官方用户提供的安装指南：`https://mcp.51ifind.com/gwstatic/static/ds_web/ifind-mcp-web/skills/SKILL_INSTALL_GUIDE.md`。
当前运行环境无法读取该指南（web 禁止抓取、容器 DNS 不可达），因此**未安装**，未运行任何未经核实的安装命令。需先取得指南内容、确认可信来源、授权及安装环境，再按指南执行。不能把网页登录地址当作 MCP endpoint。

## 数据完整性
财务指标、历史波动率、最大回撤、行业字段尚未实现真实映射。当前扶摇模式只能提供有限估值筛选能力，不可声称完整真实选股。公开仓库不存储密钥。

## 密钥安全
由于原密钥已经出现在聊天中，建议在扶摇后台撤销并重新签发，然后仅在部署环境配置新密钥。
