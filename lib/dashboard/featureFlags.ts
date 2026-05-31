export function isAnalyticsEngineEnabled(): boolean {
  return process.env.USE_ANALYTICS_ENGINE === "true";
}
