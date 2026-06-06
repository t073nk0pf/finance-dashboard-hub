export function isAnalyticsEngineEnabled(): boolean {
  return process.env.USE_ANALYTICS_ENGINE === "true";
}

export function isDashboardTemplateEnabled(): boolean {
  return process.env.USE_DASHBOARD_TEMPLATE === "true";
}
