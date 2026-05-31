type FallbackReason =
  | "analytics_engine_disabled"
  | "analytics_engine_empty_result"
  | "analytics_engine_error"
  | "invalid_query_params"
  | "legacy_armenia_fallback";

type FallbackContext = {
  route: string;
  params?: Record<string, unknown>;
  note?: string;
};

export function logDashboardFallback(reason: FallbackReason, context: FallbackContext): void {
  console.warn("[dashboard-fallback]", {
    reason,
    route: context.route,
    params: context.params ?? {},
    note: context.note,
    at: new Date().toISOString(),
  });
}
