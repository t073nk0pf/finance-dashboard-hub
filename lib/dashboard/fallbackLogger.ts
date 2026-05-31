type FallbackReason =
  | "analytics_engine_disabled"
  | "analytics_engine_empty_result"
  | "analytics_engine_error"
  | "invalid_query_params"
  | "legacy_armenia_fallback"
  | "dashboard_template_disabled"
  | "dashboard_template_empty_result"
  | "dashboard_template_error"
  | "dashboard_template_fallback_to_analytics"
  | "dashboard_template_fallback_to_legacy"
  | "forecast_template_disabled"
  | "forecast_template_empty_result"
  | "forecast_template_error"
  | "forecast_template_fallback_to_analytics"
  | "forecast_template_fallback_to_legacy"
  | "template_route_template_disabled"
  | "template_route_template_empty"
  | "template_route_template_error"
  | "template_route_analytics_disabled"
  | "template_route_analytics_empty"
  | "template_route_analytics_error"
  | "template_route_legacy_fallback";

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
