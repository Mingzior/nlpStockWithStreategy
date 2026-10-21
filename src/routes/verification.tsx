import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "@/components/Shell";

export const Route = createFileRoute("/verification")({
  head: () => ({ meta: [
    { title: "AI 编码使用与验证披露 · StockLens AI" },
    { name: "description", content: "如实披露 AI 辅助编码的使用方式，以及已执行与计划中的验证。" },
    { property: "og:title", content: "AI 编码使用与验证披露 · StockLens AI" },
    { property: "og:description", content: "区分已执行与计划中的测试，透明说明 AI 参与范围。" },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <Prose>
      <h1>AI 编码使用与验证披露</h1>
      <h2>AI 使用范围</h2>
      <ul>
        <li>本应用代码由 AI 编码助手（Lovable）根据需求说明生成，人工负责需求与验收。</li>
        <li>应用<strong>运行时不调用任何 LLM</strong>。规则解析为确定性关键词解析器，相同输入输出恒定。</li>
        <li>合成数据集由 AI 按需求人工构造，不对应任何真实公司。</li>
      </ul>
      <h2>已执行的验证（本次构建中实际运行）</h2>
      <ul>
        <li>Vitest 单元测试 7 项全部通过：解析（T1–T3）、冲突检测（T4）、缺失数据为“未知”（T5）、默认示例结果确定（T6）、影响摘要（T7）。</li>
        <li>路由匹配测试（首页可匹配）。</li>
        <li>项目构建与类型检查由平台自动执行。</li>
      </ul>
      <h2>计划中、尚未执行的验证</h2>
      <ul>
        <li>端到端浏览器自动化（输入→解析→运行→对比→保存载入全流程）</li>
        <li>屏幕阅读器与键盘可达性人工走查；移动端多机型视觉回归</li>
        <li>真实数据源适配器的契约测试（待 Fuyao / iFinD 授权后）</li>
      </ul>
      <h2>已知限制</h2>
      <ul><li>关键词词表有限，复杂语义无法覆盖，会以“未识别/需澄清”提示</li><li>策略仅保存在当前浏览器</li></ul>
    </Prose>
  ),
});