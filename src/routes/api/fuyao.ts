/**
 * Fuyao REST gateway. All credentials remain on the server.
 * This endpoint NEVER falls back to synthetic data.
 * Documentation: https://fuyao.aicubes.cn/docs/quickstart/
 */
import { createFileRoute } from "@tanstack/react-router";

const HOST = "https://fuyao.aicubes.cn";
const CODES = /^[0-9]{6}\.(SH|SZ|BJ)$/;
const PATHS = {
  prices: "/api/a-share/prices/snapshot",
  valuations: "/api/a-share/valuations/snapshot",
} as const;

type Kind = keyof typeof PATHS;

export const Route = createFileRoute("/api/fuyao")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const kind = url.searchParams.get("kind") as Kind;
        const codes = (url.searchParams.get("codes") ?? "").split(",").map((x) => x.trim());
        if (!(kind in PATHS) || codes.length === 0 || codes.length > 20 || codes.some((c) => !CODES.test(c))) {
          return Response.json({ error: "invalid_request", message: "kind=prices|valuations, codes=6位代码.SH/.SZ/.BJ；最多20只" }, { status: 400 });
        }
        const key = process.env.FUYAO_API_KEY;
        if (!key) return Response.json({ error: "not_configured", message: "服务端未配置 FUYAO_API_KEY" }, { status: 503 });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const upstream = new URL(PATHS[kind], HOST);
          upstream.searchParams.set("thscodes", codes.join(","));
          const response = await fetch(upstream, {
            headers: { "X-api-key": key, Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          });
          if (!response.ok) return Response.json({ error: "upstream_http_error", status: response.status }, { status: 502 });
          const envelope = await response.json();
          if (!envelope || envelope.code !== 0 || !Array.isArray(envelope.data?.item)) {
            return Response.json({ error: "upstream_api_error", code: envelope?.code ?? null, message: String(envelope?.message ?? "未知错误").slice(0, 160) }, { status: 502 });
          }
          return Response.json({
            mode: "real",
            provider: "Fuyao",
            kind,
            receivedAt: new Date().toISOString(),
            sourceTimestamp: envelope.data.timestamp ?? null,
            items: envelope.data.item,
          }, { headers: { "Cache-Control": "no-store" } });
        } catch (e) {
          return Response.json({ error: "upstream_unavailable", message: e instanceof Error && e.name === "AbortError" ? "上游请求超时" : "上游请求失败" }, { status: 503 });
        } finally { clearTimeout(timeout); }
      },
    },
  },
});
