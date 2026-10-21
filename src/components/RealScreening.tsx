import { useState } from "react";

type ScreenResponse = {
  provider: string; tool: string; mode: "real"; requestedAt: string;
  query: string; rawContent: string[]; warning: string;
};
type EvidenceRow = { code: string; name: string; fields: Record<string, unknown> };
function extractEvidence(raw: string[]): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  const visit = (node: unknown, depth = 0) => {
    if (depth > 5 || rows.length >= 50 || node == null) return;
    if (Array.isArray(node)) { node.slice(0, 50).forEach((v) => visit(v, depth + 1)); return; }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const code = ["thscode", "thscode", "stock_code", "stockCode", "证券代码", "股票代码", "code"].map((k) => obj[k]).find((v) => typeof v === "string" && /^(?:\\d{6}(?:\\.(?:SH|SZ|BJ))?)$/.test(v));
    if (typeof code === "string") {
      const name = ["name", "stock_name", "stockName", "证券简称", "股票简称"].map((k) => obj[k]).find((v) => typeof v === "string");
      rows.push({ code, name: typeof name === "string" ? name : code, fields: obj });
      return;
    }
    for (const value of Object.values(obj)) visit(value, depth + 1);
  };
  raw.forEach((text) => { try { visit(JSON.parse(text)); } catch { /* plain text is not a verified structured row */ } });
  return rows;
}
export function RealScreening() {
  const [query, setQuery] = useState("筛选A股中ROE大于15%、市盈率TTM小于30的股票");
  const [data, setData] = useState<ScreenResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const evidence = data ? extractEvidence(data.rawContent) : [];
  async function screen() {
    setLoading(true); setData(null); setError("");
    try {
      const response = await fetch("/api/screen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }), cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "查询失败");
      if (body.mode !== "real" || !Array.isArray(body.rawContent)) throw new Error("数据结构不符合预期");
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally { setLoading(false); }
  }
  return (
    <section className="panel space-y-3 p-4" aria-labelledby="real-screen-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="real-screen-title" className="font-semibold">真实数据 · iFinD 智能选股</h2>
        <span className="rounded border border-primary/40 px-2 py-1 text-xs text-primary">独立于合成演示模式</span>
      </div>
      <p className="text-sm text-muted-foreground">调用已验证存在的 iFinD search_securities 工具。此区域直接显示数据提供方的原始结果，不会将未核实的字段伪装成规则引擎的逐项通过结果。</p>
      <label htmlFor="real-query" className="block text-sm font-medium">真实选股条件</label>
      <textarea id="real-query" rows={2} maxLength={350} value={query} onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-input bg-background p-2 text-sm" />
      <button type="button" onClick={screen} disabled={loading || query.trim().length < 3}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {loading ? "查询中…" : "运行真实数据选股"}
      </button>
      {error && <p role="alert" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">请求未完成：{error}。未使用合成数据替代。</p>}
      {data && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-sm font-semibold">来源：{data.provider} / {data.tool}</p>
          <p className="text-xs text-muted-foreground">请求时间：{data.requestedAt}（UTC）；实际指标时点和统计口径以原始返回内容为准。</p>
          {evidence.length > 0 && <div className="space-y-2"><p className="text-sm font-medium">可识别的原始股票记录（{evidence.length}）</p>{evidence.map((row, i) => <details key={row.code + i} className="rounded border border-border p-2"><summary className="cursor-pointer text-sm">{row.name} · {row.code} · 查看原始指标及筛选依据</summary><dl className="mt-2 grid gap-1 text-xs">{Object.entries(row.fields).map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(100px,1fr)_2fr] gap-2 border-b border-border/40 py-1"><dt className="break-words text-muted-foreground">{key}</dt><dd className="break-all">{typeof value === "object" ? JSON.stringify(value) : String(value ?? "缺失")}</dd></div>)}</dl></details>)}</div>}
          {evidence.length === 0 && <p className="text-xs text-warning">上游未返回可安全识别的结构化证券记录；以下保留原始文本，暂不推断入选/排除或指标数值。</p>}
          {data.rawContent.map((content, i) => (
            <pre key={i} className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-secondary p-3 text-xs leading-relaxed">{content}</pre>
          ))}
          <p className="text-xs text-warning">{data.warning}</p>
        </div>
      )}
    </section>
  );
}
