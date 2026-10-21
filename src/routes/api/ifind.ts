/**
 * iFinD MCP discovery gateway — server-only credentials.
 * This does NOT execute MCP tools or expose their schemas to the public.
 * The three endpoint URLs are public configuration; Authorization is secret.
 */
import { createFileRoute } from "@tanstack/react-router";

type Service = "hexin-ifind-ds-mcp" | "kuaicha-enterprise-mcp" | "hexin-law-mcp";
const SERVICES: Record<Service, string> = {
  "hexin-ifind-ds-mcp": "https://api-mcp.51ifind.com:8643/ds-mcp-servers/hexin-ifind-ds-mcp",
  "kuaicha-enterprise-mcp": "https://api-mcp.51ifind.com:8643/ds-mcp-servers/kuaicha-enterprise-mcp",
  "hexin-law-mcp": "https://api-mcp.51ifind.com:8643/ds-mcp-servers/hexin-law-mcp",
};

function parseMcpResponse(body: string, contentType: string): Record<string, unknown> {
  if (contentType.includes("text/event-stream")) {
    const events = body.split(/\r?\n\r?\n/);
    for (const event of events) {
      const payload = event.split(/\r?\n/).filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim()).join("\n");
      if (payload && payload !== "[DONE]") {
        try { const data = JSON.parse(payload); if (data.result || data.error) return data; } catch { /* next event */ }
      }
    }
    throw new Error("MCP returned no parsable JSON-RPC result");
  }
  return JSON.parse(body);
}

async function rpc(url: string, auth: string, method: string, id: number, session?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const headers: Record<string, string> = {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-03-26",
    };
    if (session) headers["Mcp-Session-Id"] = session;
    const response = await fetch(url, {
      method: "POST", headers, signal: controller.signal, cache: "no-store",
      body: JSON.stringify({ jsonrpc: "2.0", id, method,
        params: method === "initialize"
          ? { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "stocklens-ai", version: "0.1.0" } }
          : {} }),
    });
    if (!response.ok) throw new Error(`MCP HTTP ${response.status}`);
    const parsed = parseMcpResponse(await response.text(), response.headers.get("content-type") ?? "");
    if (parsed.error) throw new Error("MCP JSON-RPC error");
    return { data: parsed, session: response.headers.get("mcp-session-id") ?? session };
  } finally { clearTimeout(timeout); }
}

export const Route = createFileRoute("/api/ifind")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const service = url.searchParams.get("service") ?? "hexin-ifind-ds-mcp";
        if (!(service in SERVICES)) return Response.json({ status: "invalid_service" }, { status: 400 });
        // This is a connectivity/metadata check, not a public tool-call proxy.
        const auth = process.env.IFIND_MCP_AUTHORIZATION;
        if (!auth) return Response.json({ service, status: "not_configured", message: "服务器未配置 iFinD MCP 凭证" }, { status: 503 });
        try {
          const endpoint = SERVICES[service as Service];
          const init = await rpc(endpoint, auth, "initialize", 1);
          const listed = await rpc(endpoint, auth, "tools/list", 2, init.session);
          const result = listed.data.result as { tools?: { name?: string }[] } | undefined;
          const names = result?.tools?.map((t) => t.name).filter(Boolean) ?? [];
          return Response.json({ service, status: "connected", toolCount: names.length,
            tools: names, checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "连接失败";
          const reason = /abort/i.test(msg) ? "timeout" : /HTTP 401|HTTP 403/.test(msg) ? "unauthorized" : "unavailable";
          return Response.json({ service, status: reason, message: "MCP 初始化或工具发现失败；请检查服务器配置、授权及服务可用性" }, { status: 502 });
        }
      },
    },
  },
});
