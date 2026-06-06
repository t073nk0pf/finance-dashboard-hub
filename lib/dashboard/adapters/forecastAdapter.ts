import type { ForecastResult } from "@/lib/forecast/types";
import type { DashboardForecastApiResponse } from "@/lib/dashboard/types";

export function adaptForecastToDashboardResponse(forecast: ForecastResult): DashboardForecastApiResponse {
  return {
    scenarios: forecast.scenarios,
    rows: forecast.rows,
    summary: forecast.summary,
    generatedAt: forecast.generatedAt,
  };
}

export function buildForecastFallbackResponse(): DashboardForecastApiResponse {
  return {
    scenarios: [],
    next: "Forecast engine placeholder. Rules will be stored in NetworkGrowthScenario and ManualAdjustment.",
  };
}
