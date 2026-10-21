import { createFileRoute } from "@tanstack/react-router";
import { Prose, SyntheticBadge } from "@/components/Shell";

export const Route = createFileRoute("/prd")({
  head: () => ({ meta: [
    { title: "PRD · StockLens AI" },
    { name: "description", content: "StockLens AI 自然语言智能选股与策略解释器的完整产品需求文档。" },
    { property: "og:title", content: "PRD · StockLens AI" },
    { property: "og:description", content: "目标、用户、功能范围、规则口径、合规与非目标。" },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <Prose>
      <h1>产品需求文档（PRD）</h1>
      <SyntheticBadge />
      <h2>1. 背景与目标</h2>
      <p>普通投资者习惯用“经营改善、估值合理、走势稳定”等自然语言表达偏好，但现有选股器要求精确指标。StockLens AI 将自然语言透明地转为可编辑数值规则，并逐只、逐条解释筛选结果，强调可追溯与确定性。</p>
      <h2>2. 目标用户</h2>
      <ul><li>希望理解“条件→结果”关系的个人研究者</li><li>需要演示规则引擎的产品/投研团队</li></ul>
      <h2>3. 核心流程</h2>
      <ul>
        <li>输入自然语言 → 确定性关键词解析器生成规则，并给出解释、澄清（模糊词）与未识别提示</li>
        <li>编辑规则：指标、运算符（≥ &gt; ≤ &lt; 介于）、阈值；可增删</li>
        <li>冲突检测：同一指标区间无交集、区间倒置、非法数值 → 阻止运行</li>
        <li>确定性筛选：任一失败=排除；无失败但缺失=未知；全部通过=入选。缺失永不视为通过</li>
        <li>结果表：状态、通过数、主要原因；逐项追溯取值/单位/口径/统计期/来源/截至日期</li>
        <li>对比 2–4 只股票（图表 + 表格）；修改规则后重跑并展示影响摘要</li>
        <li>策略保存/载入/删除（浏览器 localStorage）</li>
      </ul>
      <h2>4. 规则口径（默认，可编辑）</h2>
      <table><thead><tr><th>表述</th><th>规则</th></tr></thead><tbody>
        <tr><td>经营改善</td><td>营收同比 ≥10% 且 净利润同比 ≥10%</td></tr>
        <tr><td>估值合理</td><td>PE 介于 8–30 倍（主观表述，提示用户确认）</td></tr>
        <tr><td>走势稳定</td><td>60日波动率 ≤30% 且 近1年最大回撤 ≤25%</td></tr>
        <tr><td>低估值 / 高估值</td><td>PE ≤15 且 PB ≤2 / PE ≥40</td></tr>
        <tr><td>高成长 / 盈利能力强 / 高毛利 / 低负债</td><td>营收 ≥25% / ROE ≥15% / 毛利率 ≥40% / 负债率 ≤50%</td></tr>
        <tr><td>数值表达</td><td>如 PE&lt;20、ROE&gt;=15、负债率不超过50</td></tr>
      </tbody></table>
      <h2>5. 数据</h2>
      <p>内置 11 只虚构股票（SYN-001 ~ SYN-011），数值人工构造，含刻意缺失字段。所有结果区域标注“合成演示数据，非真实行情”，不展示任何价格。数据源适配器接口预留 Fuyao 与 iFinD，当前为禁用/不可用；真实接入须通过服务端函数与服务端密钥，浏览器不存放 API Key。</p>
      <h2>6. 非目标</h2>
      <ul><li>不提供实时行情、价格、交易或下单</li><li>不提供投资建议、评级或收益承诺</li><li>不使用 LLM（当前版本）；未来若接入须明确标注</li></ul>
      <h2>7. 合规</h2>
      <p>页脚常驻免责声明；文案避免“推荐买入”等表述；结果仅为规则计算过程展示。</p>
      <h2>8. 代码仓库</h2>
      <p>计划迁移至 https://github.com/Mingzior/nlpStockWithStreategy 。当前应用尚未确认与该仓库同步。</p>
    </Prose>
  ),
});