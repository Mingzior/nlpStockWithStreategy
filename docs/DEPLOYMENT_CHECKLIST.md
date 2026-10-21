# Production deployment checklist (StockLens AI)

The app uses TanStack Start SSR and server API routes. **Do not deploy only the static .output/public directory as the full application:** /api/screen and /api/fuyao need a running server.

1. Choose a host that supports the generated TanStack Start/Nitro server runtime (Node or a compatible adapter). Configure its build command `npm install && npm run build` and the runtime entry appropriate to the generated `.output/server` artifacts. Verify runtime compatibility with the host's documentation before publishing.
2. Add `IFIND_MCP_AUTHORIZATION` and `FUYAO_API_KEY` as **server-only** environment variables on that host; GitHub Actions Secrets are not automatically inherited by the host. Do not use `VITE_` prefixes for secrets.
3. Before public access, add authentication, per-user/IP rate limiting, cost quota and upstream license compliance for `/api/screen`. A public unauthenticated route could spend the API quota.
4. Check `/`, `/prd`, `/verification`, `/tests`, and a POST to `/api/screen`. Check error behavior with missing keys, 429, timeouts and invalid requests.
5. Confirm response data's origin, date and units; never treat a request timestamp as a market-data timestamp.
6. Record actual deployment URL and a successful end-to-end test before marking production deployed.

## CI vs API smoke test

- CI automatically installs dependencies, runs unit tests and builds. Its green result does not verify live upstream credentials.
- `Validate Financial APIs` runs manually with Actions Secrets; the updated workflow calls both `search_securities` and `get_security_indicators` and prints only result *structure*, not financial records.
- Fuyao HTTP 429 is recorded as WARN/inconclusive, not PASS. Avoid repeated requests to bypass rate limits.
- A green smoke test only proves tools/call accepted and returned content, not that per-stock metrics were mapped correctly.

## Honest implementation status

The synthetic demonstration implements deterministic pass/fail/missing and rule-edit impact. The live iFinD panel shows original provider output and cautiously exposes fields when a stock code can be identified; **it does not yet independently compute pass/fail per rule from validated real financial metrics**. This requires successful tools/call samples and verified field-level definitions, units, period and timestamp. No production URL is asserted without deployment verification.
