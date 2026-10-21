import { createFileRoute } from "@tanstack/react-router";

/** Server-only iFinD smart-screening bridge. No arbitrary tool names or URLs accepted. */
const ENDPOINT = "https://api-mcp.51ifind.com:8643/ds-mcp-servers/hexin-ifind-ds-mcp";
const MAX_QUERY = 350;

function decode(body: string, type: string): Record<string, unknown> {
  if (!type.includes("text/event-stream")) return JSON.parse(body);
  for (const event of body.split(/\r?\n\r?\n/)) {
    const data = event.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
    if (!data || data === "[DONE]") continue;
    try {
      const parsed = JSON.parse(data);
      if (parsed.result || parsed.error) return parsed;
    } catch { /* ignore non-JSON events */ }
  }
  throw new Error("empty_mcp_response");
}
async function call(auth: string, method: string, params: Record<string, unknown>, session?: string) {
  const headers: Record<string, string> = {
    Authorization: auth, "Content-Type": "application/json",
    Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-03-26",
  };
  if (session) headers["Mcp-Session-Id"] = session;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST", headers, signal: ctrl.signal, cache: "no-store",
      body: JSON.stringify({ jsonrpc: "2.0", id: method === "initialize" ? 1 : 2, method, params }),
    });
    if (!response.ok) throw new Error("MCP HTTP " + response.status);
    const result = decode(await response.text(), response.headers.get("content-type") ?? "");
    if (result.error) throw new Error("MCP returned a JSON-RPC error");
    return { result, session: response.headers.get("mcp-session-id") ?? session };
  } finally { clearTimeout(timer); }
}
export const Route = createFileRoute("/api/screen")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && new URL(origin).origin !== new URL(request.url).origin) {
          return Response.json({ error: "cross_origin_denied" }, { status: 403 });
        }
        const auth = process.env.IFIND_MCP_AUTHORIZATION;
        if (!auth) return Response.json({ error: "not_configured", message: "服务端未配置 iFinD MCP 密钥" }, { status: 503 });
        let payload: unknown;
        try { payload = await request.json(); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
        const query = (payload as { query?: unknown })?.query;
        if (typeof query !== "string" || query.trim().length < 3 || query.length > MAX_QUERY) {
          return Response.json({ error: "invalid_query", message: "请输入3–350字的选股条件" }, { status: 400 });
        }
        try {
          const init = await call(auth, "initialize", {
            protocolVersion: "2025-03-26", capabilities: {},
            clientInfo: { name: "stocklens-ai", version: "0.2.0" },
          });
          const response = await call(auth, "tools/call", {
            name: "search_securities", arguments: { market: "股票", query: query.trim() },
          }, init.session);
          const result = response.result.result as { content?: { type: string; text?: string }[]; isError?: boolean } | undefined;
          if (!result || result.isError) throw new Error("MCP tool reported an error");
          const blocks = (result.content ?? []).filter((c) => c.type === "text" && typeof c.text === "string")
            .map((c) => (c.text ?? "").slice(0, 18000));
          if (!blocks.length) throw new Error("MCP returned no text");
          return Response.json({
            provider: "iFinD MCP", tool: "search_securities", mode: "real",
            requestedAt: new Date().toISOString(), query: query.trim(),
            // Preserve original tool response, not fabricated metrics or eligibility decisions.
            rawContent: blocks, warning: "筛选条件与指标口径以 iFinD 原始结果为准；未独立复核的数值不可视为确定性结论。",
          }, { headers: { "Cache-Control": "no-store" } });
        } catch {
          return Response.json({ error: "upstream_failure", message: "iFinD 智能选股调用失败或返回结构不完整，未生成替代结果" }, { status: 502 });
        }
      },
    },
  },
});
