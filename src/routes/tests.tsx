import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "@/components/Shell";

const CASES: [string, string, string, string][] = [
  ["T1", "点击“默认示例”", "生成营收、净利润、PE 区间、波动率、回撤共 5 条规则并显示解释", "已执行（单元测试）"],
  ["T2", "输入 PE<20", "生成 PE < 20 规则", "已执行（单元测试）"],
  ["T3", "点击“模糊表述测试”", "显示“需澄清”提示，不生成规则", "已执行（单元测试）"],
  ["T4", "点击“冲突测试”", "红色提示 PE 条件矛盾，运行按钮禁用", "已执行（单元测试）"],
  ["T5", "点击“缺失数据测试”并运行", "远帆物流等显示“未知（数据缺失）”，原因写明缺失", "已执行（单元测试）"],
  ["T6", "默认示例运行", "入选 SYN-001、SYN-005、SYN-010", "已执行（单元测试）"],
  ["T7", "修改阈值后重新运行", "出现影响摘要：数量变化、规则变更、状态变化列表", "已执行（单元测试）"],
  ["T8", "点“逐项追溯”", "显示取值、单位、口径、统计期、来源、截至日期", "计划（人工/E2E）"],
  ["T9", "勾选 2–4 只股票", "显示对比图表与表格，第 5 只不可勾选", "计划（人工/E2E）"],
  ["T10", "保存策略并刷新页面后载入", "策略仍在列表中，载入后规则恢复", "计划（人工/E2E）"],
  ["T11", "数据源切换为 Fuyao / iFinD", "显示未接入错误，无数据，运行禁用", "计划（人工/E2E）"],
  ["T12", "检查所有结果区域", "均显示“合成演示数据，非真实行情”，无任何价格", "计划（人工）"],
];

export const Route = createFileRoute("/tests")({
  head: () => ({ meta: [
    { title: "验收测试 · StockLens AI" },
    { name: "description", content: "StockLens AI 验收测试用例与执行状态。" },
    { property: "og:title", content: "验收测试 · StockLens AI" },
    { property: "og:description", content: "12 项验收用例，区分已执行与计划中。" },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <Prose>
      <h1>验收测试</h1>
      <p>“已执行”指本次构建中实际运行并通过（src/test/engine.test.ts）；“计划”指尚未执行。</p>
      <table><thead><tr><th>编号</th><th>操作</th><th>预期</th><th>状态</th></tr></thead>
        <tbody>{CASES.map((c) => <tr key={c[0]}>{c.map((x, i) => <td key={i}>{x}</td>)}</tr>)}</tbody>
      </table>
    </Prose>
  ),
});