import type { MetricDirection } from "@/lib/analytics/model";
import type { ForecastStatus } from "@/lib/forecast/types";

type ForecastStatusInput = {
  actualValue?: number;
  planValue?: number;
  forecastValue?: number;
  direction: MetricDirection;
};

export function calculateForecastStatus(input: ForecastStatusInput): ForecastStatus {
  const { actualValue, planValue, forecastValue, direction } = input;

  if (!Number.isFinite(actualValue) || actualValue === undefined) return "no_data";
  if (!Number.isFinite(planValue) || !Number.isFinite(forecastValue) || !planValue || planValue === 0) return "no_data";
  const plan = Number(planValue);
  const forecast = Number(forecastValue);

  if (direction === "higher_is_better") {
    const completion = (forecast / plan) * 100;
    if (completion >= 100) return "on_track";
    if (completion >= 95) return "attention";
    if (completion >= 85) return "risk";
    return "critical";
  }

  if (direction === "lower_is_better") {
    if (forecast <= plan) return "on_track";
    const overPlanPercent = ((forecast - plan) / Math.abs(plan)) * 100;
    if (overPlanPercent <= 5) return "attention";
    if (overPlanPercent <= 15) return "risk";
    return "critical";
  }

  return "on_track";
}
