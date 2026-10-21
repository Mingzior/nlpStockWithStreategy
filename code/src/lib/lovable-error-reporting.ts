/** Standalone GitHub build: no Lovable telemetry credentials or SDK required. */
export function reportLovableError(error: unknown, context?: Record<string, unknown>): void {
  if (typeof console !== "undefined") {
    console.error("StockLens boundary error", context?.boundary ?? "unknown", error);
  }
}
