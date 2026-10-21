import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DATASET_LABEL } from "@/lib/stocks";

const NAV = [
  { to: "/", label: "智能选股" },
  { to: "/prd", label: "PRD" },
  { to: "/verification", label: "AI 使用与验证" },
  { to: "/tests", label: "验收测试" },
] as const;

export function SyntheticBadge({ className = "" }: { className?: string }) {
  return (
    <span role="note" className={`inline-flex items-center gap-1.5 rounded-md border border-warning/50 bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning ${className}`}>
      ⚠ {DATASET_LABEL}
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background bg-hero font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-primary">StockLens AI</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">自然语言智能选股与策略解释器</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm" aria-label="主导航">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-xs text-muted-foreground">演示与真实数据分区</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-border bg-card/60">
        <div className="mx-auto max-w-7xl space-y-1 px-4 py-5 text-xs leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">合规声明：</strong>本应用包含明确标记的合成演示数据和独立的 iFinD 实时请求区域；合成数据不代表真实公司或行情。</p>
          <p>本工具仅展示规则筛选的计算过程，不构成任何投资建议、收益承诺或买卖推荐。投资有风险，决策需谨慎。iFinD 真实选股需服务器配置凭证；扶摇接入仍需验证业务字段映射。</p>
        </div>
      </footer>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <article className="panel mx-auto max-w-4xl space-y-4 p-6 text-[15px] leading-7 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-primary [&_li]:ml-5 [&_li]:list-disc [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-secondary [&_th]:p-2 [&_th]:text-left">{children}</article>;
}