import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SyntheticBadge } from "@/components/Shell";
import { ADAPTERS, type DataSourceAdapter } from "@/lib/adapters";
import {
  OPS, STATUS_LABEL, computeImpact, detectConflicts, parseQuery, ruleText, runScreen,
  type Impact, type Op, type ParseNote, type Rule, type Status, type StockResult,
} from "@/lib/engine";
import { DATASET_AS_OF, DATASET_LABEL, DATASET_SOURCE, METRICS, METRIC_KEYS, type MetricKey, type Stock } from "@/lib/stocks";
import { loadStrategies, saveStrategies, type SavedStrategy } from "@/lib/strategies";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockLens AI · 自然语言智能选股与策略解释器" },
      { name: "description", content: "用自然语言描述选股条件，透明解析为可编辑规则，确定性筛选并逐项解释原因。合成演示数据，非真实行情。" },
      { property: "og:title", content: "StockLens AI · 自然语言智能选股与策略解释器" },
      { property: "og:description", content: "透明、可追溯的规则选股演示：解析、冲突检测、筛选解释、对比与策略保存。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Screener,
});

const EXAMPLES = [
  { label: "默认示例", q: "经营改善、估值合理、走势稳定" },
  { label: "成长型", q: "高成长，盈利能力强，高毛利" },
  { label: "稳健型", q: "低估值，低负债，走势稳定" },
  { label: "数值条件", q: "ROE>=15，PE<30，负债率<=50" },
  { label: "冲突测试", q: "低估值，高估值" },
  { label: "缺失数据测试", q: "高毛利，走势稳定" },
  { label: "模糊表述测试", q: "好公司，有潜力" },
];

const STATUS_STYLE: Record<Status, string> = {
  included: "border-success/50 bg-success/15 text-success",
  excluded: "border-destructive/50 bg-destructive/15 text-destructive",
  unknown: "border-warning/50 bg-warning/15 text-warning",
};

const btn = "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ring";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnGhost = `${btn} border border-border bg-secondary text-secondary-foreground hover:bg-muted`;
const input = "rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

interface RunState { rules: Rule[]; results: StockResult[]; at: string }

function Screener() {
  const [query, setQuery] = useState(EXAMPLES[0].q);
  const [notes, setNotes] = useState<ParseNote[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [run, setRun] = useState<RunState | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [adapter, setAdapter] = useState<DataSourceAdapter>(ADAPTERS[0]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [universe, setUniverse] = useState<Stock[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<SavedStrategy[]>([]);
  const [stratName, setStratName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { setStrategies(loadStrategies()); }, []);
  useEffect(() => {
    let alive = true;
    setDataError(null);
    adapter.fetchUniverse().then((u) => alive && setUniverse(u.stocks)).catch((e: Error) => { if (alive) { setUniverse([]); setDataError(e.message); } });
    return () => { alive = false; };
  }, [adapter]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  const conflicts = useMemo(() => detectConflicts(rules), [rules]);
  const conflictIds = new Set(conflicts.flatMap((c) => c.ruleIds));
  const dirty = run !== null && JSON.stringify(run.rules) !== JSON.stringify(rules);
  const canRun = rules.length > 0 && conflicts.length === 0 && !dataError && universe.length > 0;

  function doParse(q = query) {
    const r = parseQuery(q);
    setNotes(r.notes);
    setRules(r.rules);
  }
  function doRun() {
    if (!canRun) return;
    const results = runScreen(universe, rules);
    const snapshot = rules.map((r) => ({ ...r }));
    setImpact(run ? computeImpact(run.rules, run.results, snapshot, results) : null);
    setRun({ rules: snapshot, results, at: new Date().toLocaleString("zh-CN") });
    setExpanded(null);
  }
  function updateRule(id: string, patch: Partial<Rule>) { setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  function addRule() { setRules((rs) => [...rs, { id: `m${Date.now()}`, metric: "roe", op: ">=", value: 10, origin: "手动添加" }]); }
  function persist(list: SavedStrategy[]) { setStrategies(list); saveStrategies(list); }
  function saveStrategy() {
    const name = stratName.trim() || `策略 ${strategies.length + 1}`;
    persist([{ id: `s${Date.now()}`, name, query, rules, savedAt: new Date().toLocaleString("zh-CN") }, ...strategies]);
    setStratName(""); setToast(`已保存「${name}」到本地浏览器`);
  }
  function loadStrategy(s: SavedStrategy) { setQuery(s.query); setRules(s.rules.map((r) => ({ ...r }))); setNotes([{ kind: "info", text: `已载入策略「${s.name}」，点击“运行筛选”查看结果` }]); }

  const counts = run ? { included: run.results.filter((r) => r.status === "included").length, excluded: run.results.filter((r) => r.status === "excluded").length, unknown: run.results.filter((r) => r.status === "unknown").length } : null;
  const shown = run ? run.results.filter((r) => filter === "all" || r.status === filter) : [];
  const compareStocks = universe.filter((s) => selected.includes(s.code));

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">用一句话描述你的选股条件</h1>
        <p className="max-w-3xl text-muted-foreground">系统会把描述转换为<strong className="text-foreground">可见、可编辑的数值规则</strong>，对每只股票逐条判断并给出原因。数据缺失一律不算通过。</p>
      </section>

      {/* 1. 输入 */}
      <section className="panel space-y-3 p-4" aria-labelledby="s1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="s1" className="font-semibold">① 自然语言输入</h2>
          <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">解析方式：确定性关键词解析器（非 LLM，相同输入结果恒定）</span>
        </div>
        <label htmlFor="q" className="sr-only">选股描述</label>
        <textarea id="q" value={query} onChange={(e) => setQuery(e.target.value)} rows={2} className={`${input} w-full text-base`} placeholder="例如：经营改善、估值合理、走势稳定" />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e.label} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary" onClick={() => { setQuery(e.q); doParse(e.q); }}>{e.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => doParse()}>解析为规则</button>
        </div>
        {notes.length > 0 && (
          <ul className="space-y-1 text-sm" aria-live="polite">
            {notes.map((n, i) => (
              <li key={i} className={`rounded-md border px-3 py-1.5 ${n.kind === "info" ? "border-primary/30 bg-primary/10 text-foreground" : n.kind === "ambiguous" ? "border-warning/50 bg-warning/10 text-warning" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
                {n.kind === "info" ? "ℹ 解释：" : n.kind === "ambiguous" ? "？需澄清：" : "✕ 未识别："}{n.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* 2. 规则 */}
        <section className="panel space-y-3 p-4" aria-labelledby="s2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="s2" className="font-semibold">② 结构化规则（可编辑）</h2>
            <button className={btnGhost} onClick={addRule}>+ 添加规则</button>
          </div>
          {rules.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">暂无规则。请先输入描述并点击“解析为规则”，或选择上方示例，或手动添加。</p>
          ) : (
            <ul className="space-y-2">
              {rules.map((r) => (
                <li key={r.id} className={`flex flex-wrap items-center gap-2 rounded-md border p-2 ${conflictIds.has(r.id) ? "border-destructive bg-destructive/10" : "border-border bg-background/40"}`}>
                  <select aria-label="指标" className={input} value={r.metric} onChange={(e) => updateRule(r.id, { metric: e.target.value as MetricKey })}>
                    {METRIC_KEYS.map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
                  </select>
                  <select aria-label="运算符" className={input} value={r.op} onChange={(e) => updateRule(r.id, { op: e.target.value as Op, value2: e.target.value === "between" ? (r.value2 ?? r.value + 10) : undefined })}>
                    {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input aria-label="阈值" type="number" className={`${input} w-24 font-mono`} value={Number.isFinite(r.value) ? r.value : ""} onChange={(e) => updateRule(r.id, { value: e.target.value === "" ? NaN : Number(e.target.value) })} />
                  {r.op === "between" && (<><span className="text-sm text-muted-foreground">至</span><input aria-label="上限" type="number" className={`${input} w-24 font-mono`} value={Number.isFinite(r.value2 ?? NaN) ? r.value2 : ""} onChange={(e) => updateRule(r.id, { value2: e.target.value === "" ? NaN : Number(e.target.value) })} /></>)}
                  <span className="text-sm text-muted-foreground">{METRICS[r.metric].unit}</span>
                  <span className="text-xs text-muted-foreground">来源：「{r.origin}」</span>
                  <button aria-label="删除规则" className="ml-auto rounded px-2 text-muted-foreground hover:text-destructive" onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))}>✕</button>
                </li>
              ))}
            </ul>
          )}
          {conflicts.length > 0 && (
            <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-semibold">检测到不兼容条件，已阻止运行：</p>
              <ul>{conflicts.map((c, i) => <li key={i} className="ml-5 list-disc">{c.message}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <button className={btnPrimary} disabled={!canRun} onClick={doRun}>{run ? "重新运行筛选" : "运行筛选"}</button>
            {dirty && <span className="text-xs text-warning">规则已修改，结果尚未更新</span>}
            {!canRun && rules.length > 0 && conflicts.length === 0 && dataError && <span className="text-xs text-destructive">数据源不可用，无法运行</span>}
          </div>
        </section>

        {/* 侧栏：数据源 + 策略 */}
        <aside className="space-y-4">
          <section className="panel space-y-2 p-4" aria-labelledby="ds">
            <h2 id="ds" className="font-semibold">数据源</h2>
            {ADAPTERS.map((a) => (
              <label key={a.id} className={`flex cursor-pointer gap-2 rounded-md border p-2 text-sm ${adapter.id === a.id ? "border-primary" : "border-border"}`}>
                <input type="radio" name="adapter" checked={adapter.id === a.id} onChange={() => setAdapter(a)} />
                <span>
                  <span className="font-medium">{a.name}</span>{" "}
                  <span className={`text-xs ${a.status === "available" ? "text-success" : "text-muted-foreground"}`}>[{a.status === "available" ? "可用·合成" : a.status === "disabled" ? "已禁用" : "不可用"}]</span>
                  <span className="block text-xs text-muted-foreground">{a.description}</span>
                </span>
              </label>
            ))}
            {dataError && <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{dataError}</p>}
          </section>
          <section className="panel space-y-2 p-4" aria-labelledby="st">
            <h2 id="st" className="font-semibold">我的策略（本地保存）</h2>
            <div className="flex gap-2">
              <input aria-label="策略名称" className={`${input} min-w-0 flex-1`} placeholder="策略名称" value={stratName} onChange={(e) => setStratName(e.target.value)} />
              <button className={btnGhost} disabled={rules.length === 0} onClick={saveStrategy}>保存</button>
            </div>
            {strategies.length === 0 ? <p className="text-xs text-muted-foreground">尚无已保存策略。保存在本浏览器 localStorage 中，不会上传。</p> : (
              <ul className="max-h-60 space-y-1 overflow-auto">
                {strategies.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <button className="min-w-0 flex-1 text-left hover:text-primary" onClick={() => loadStrategy(s)}>
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.rules.length} 条规则 · {s.savedAt}</span>
                    </button>
                    <button aria-label={`删除策略 ${s.name}`} className="text-muted-foreground hover:text-destructive" onClick={() => persist(strategies.filter((x) => x.id !== s.id))}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* 影响摘要 */}
      {impact && (
        <section className="panel space-y-2 border-primary/40 p-4" aria-labelledby="imp">
          <h2 id="imp" className="font-semibold">规则变更影响摘要</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            {(["included", "unknown", "excluded"] as Status[]).map((s) => (
              <div key={s} className="rounded-md border border-border p-2">
                <div className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</div>
                <div className="font-mono text-lg">{impact.before[s]} → {impact.after[s]} <span className="text-xs">({impact.after[s] - impact.before[s] >= 0 ? "+" : ""}{impact.after[s] - impact.before[s]})</span></div>
              </div>
            ))}
          </div>
          <ul className="space-y-0.5 text-sm">
            {impact.addedRules.map((t) => <li key={t}>＋ 新增规则：{t}</li>)}
            {impact.removedRules.map((t) => <li key={t}>－ 删除规则：{t}</li>)}
            {impact.changedRules.map((t) => <li key={t}>～ 修改规则：{t}</li>)}
            {impact.addedRules.length + impact.removedRules.length + impact.changedRules.length === 0 && <li className="text-muted-foreground">规则未变化。</li>}
          </ul>
          {impact.changes.length > 0 ? (
            <ul className="flex flex-wrap gap-2 text-xs">
              {impact.changes.map((c) => <li key={c.code} className="rounded border border-border px-2 py-1">{c.name}：{STATUS_LABEL[c.from]} → <strong>{STATUS_LABEL[c.to]}</strong></li>)}
            </ul>
          ) : <p className="text-xs text-muted-foreground">没有股票状态发生变化。</p>}
        </section>
      )}

      {/* 3. 结果 */}
      <section className="panel space-y-3 p-4" aria-labelledby="s3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="s3" className="font-semibold">③ 筛选结果</h2>
          <SyntheticBadge />
          {run && <span className="text-xs text-muted-foreground">运行于 {run.at} · 快照日期 {DATASET_AS_OF}（虚构）</span>}
        </div>
        {!run ? (
          <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">尚未运行筛选。解析规则后点击“运行筛选”。</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="按状态过滤">
              {(["all", "included", "unknown", "excluded"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-md border px-3 py-1 text-sm ${filter === f ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                  {f === "all" ? `全部 ${run.results.length}` : `${STATUS_LABEL[f]} ${counts![f]}`}
                </button>
              ))}
            </div>
            {counts!.included === 0 && <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">当前规则下没有股票全部满足条件。可尝试放宽阈值或删除部分规则后重新运行。</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-2">对比</th><th className="p-2">代码 / 名称</th><th className="p-2">行业</th><th className="p-2">状态</th><th className="p-2">规则通过</th><th className="p-2">主要原因</th><th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">该状态下没有股票。</td></tr>}
                  {shown.map((r) => {
                    const pass = r.checks.filter((c) => c.result === "pass").length;
                    const key = r.checks.find((c) => c.result === "fail") ?? r.checks.find((c) => c.result === "missing");
                    const open = expanded === r.stock.code;
                    return (
                      <Fragment key={r.stock.code}>
                        <tr className="border-b border-border/60 hover:bg-secondary/40">
                          <td className="p-2"><input type="checkbox" aria-label={`加入对比 ${r.stock.name}`} checked={selected.includes(r.stock.code)} disabled={!selected.includes(r.stock.code) && selected.length >= 4} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.stock.code] : s.filter((x) => x !== r.stock.code)))} /></td>
                          <td className="p-2"><span className="font-mono text-xs text-muted-foreground">{r.stock.code}</span><br />{r.stock.name}</td>
                          <td className="p-2 text-muted-foreground">{r.stock.industry}</td>
                          <td className="p-2"><span className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                          <td className="p-2 font-mono">{pass}/{r.checks.length}</td>
                          <td className="p-2 text-xs text-muted-foreground">{key ? key.reason : "全部规则均满足"}</td>
                          <td className="p-2"><button className="text-xs text-primary hover:underline" aria-expanded={open} onClick={() => setExpanded(open ? null : r.stock.code)}>{open ? "收起" : "逐项追溯"}</button></td>
                        </tr>
                        {open && (
                          <tr className="bg-background/50"><td colSpan={7} className="p-3"><TraceTable result={r} /></td></tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">最多选择 4 只进行对比。所有数值均为{DATASET_LABEL}，不显示任何价格。</p>
          </>
        )}
      </section>

      {/* 4. 对比 */}
      <section className="panel space-y-3 p-4" aria-labelledby="s4">
        <div className="flex flex-wrap items-center gap-3"><h2 id="s4" className="font-semibold">④ 股票对比</h2><SyntheticBadge /></div>
        {compareStocks.length < 2 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">在结果表中勾选 2–4 只股票进行对比（已选 {compareStocks.length}）。</p>
        ) : <Compare stocks={compareStocks} results={run?.results ?? []} onClear={() => setSelected([])} />}
      </section>

      {toast && <div role="status" className="fixed bottom-4 right-4 z-30 rounded-md border border-primary bg-card px-4 py-2 text-sm shadow-lg">{toast}</div>}
    </div>
  );
}

function TraceTable({ result }: { result: StockResult }) {
  if (result.checks.length === 0) return <p className="text-sm text-muted-foreground">无规则。</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-left text-muted-foreground"><th className="p-1.5">规则</th><th className="p-1.5">取值</th><th className="p-1.5">判定</th><th className="p-1.5">口径定义</th><th className="p-1.5">统计期</th><th className="p-1.5">来源</th><th className="p-1.5">截至</th></tr></thead>
        <tbody>
          {result.checks.map((c) => {
            const d = METRICS[c.rule.metric];
            return (
              <tr key={c.rule.id} className="border-t border-border/50 align-top">
                <td className="p-1.5">{ruleText(c.rule)}</td>
                <td className="p-1.5 font-mono">{c.value === null ? "—" : `${c.value}${d.unit}`}</td>
                <td className={`p-1.5 font-semibold ${c.result === "pass" ? "text-success" : c.result === "fail" ? "text-destructive" : "text-warning"}`}>{c.result === "pass" ? "通过" : c.result === "fail" ? "不通过" : "缺失（不算通过）"}<div className="font-normal text-muted-foreground">{c.reason}</div></td>
                <td className="p-1.5 text-muted-foreground">{d.definition}</td>
                <td className="p-1.5 text-muted-foreground">{d.period}</td>
                <td className="p-1.5 text-muted-foreground">{DATASET_SOURCE}</td>
                <td className="p-1.5 font-mono text-muted-foreground">{DATASET_AS_OF}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function Compare({ stocks, results, onClear }: { stocks: Stock[]; results: StockResult[]; onClear: () => void }) {
  const [group, setGroup] = useState<"pct" | "x">("pct");
  const keys = METRIC_KEYS.filter((k) => (group === "x" ? METRICS[k].unit === "倍" : METRICS[k].unit === "%"));
  const data = keys.map((k) => ({ metric: METRICS[k].label, ...Object.fromEntries(stocks.map((s) => [s.name, s.metrics[k]])) }));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className={`rounded-md border px-3 py-1 text-sm ${group === "pct" ? "border-primary text-primary" : "border-border text-muted-foreground"}`} onClick={() => setGroup("pct")}>百分比指标</button>
        <button className={`rounded-md border px-3 py-1 text-sm ${group === "x" ? "border-primary text-primary" : "border-border text-muted-foreground"}`} onClick={() => setGroup("x")}>估值倍数</button>
        <button className="ml-auto text-sm text-muted-foreground hover:text-foreground" onClick={onClear}>清空对比</button>
      </div>
      <div className="h-72 w-full" role="img" aria-label="所选股票指标对比柱状图（合成数据）">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="metric" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {stocks.map((s, i) => <Bar key={s.code} dataKey={s.name} fill={CHART_COLORS[i]} radius={[3, 3, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">缺失值在图中不显示柱形，在下表显示为“—”。</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="p-2">指标</th>{stocks.map((s) => <th key={s.code} className="p-2">{s.name}</th>)}</tr></thead>
          <tbody>
            <tr className="border-b border-border/60"><td className="p-2 text-muted-foreground">筛选状态</td>{stocks.map((s) => { const st = results.find((r) => r.stock.code === s.code)?.status; return <td key={s.code} className="p-2">{st ? STATUS_LABEL[st] : "未运行"}</td>; })}</tr>
            {METRIC_KEYS.map((k) => (
              <tr key={k} className="border-b border-border/60">
                <td className="p-2 text-muted-foreground" title={METRICS[k].definition}>{METRICS[k].label}（{METRICS[k].unit}）</td>
                {stocks.map((s) => <td key={s.code} className="p-2 font-mono">{s.metrics[k] ?? "—"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}