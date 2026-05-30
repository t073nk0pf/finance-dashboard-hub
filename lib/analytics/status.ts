import type { MetricDirection } from "@/lib/analytics/model";
import type { PlanFactStatus } from "@/lib/analytics/types";

export type PlanFactStatusInput = {
  planValue: number;
  factValue: number;
  varianceValue: number;
  variancePercent: number | null;
  completionPercent: number | null;
  direction: MetricDirection;
  metricKey?: string;
};

export function calculatePlanFactStatus(input: PlanFactStatusInput): PlanFactStatus {
  const { planValue, factValue, direction, completionPercent } = input;

  if (!Number.isFinite(planValue) || !Number.isFinite(factValue) || planValue === 0) return "no_data";

  if (direction === "higher_is_better") {
    if (completionPercent === null) return "no_data";
    if (completionPercent >= 100) return "normal";
    if (completionPercent >= 95) return "attention";
    if (completionPercent >= 85) return "risk";
    return "critical";
  }

  if (direction === "lower_is_better") {
    if (factValue <= planValue) return "normal";

    const overPlanPercent = ((factValue - planValue) / Math.abs(planValue)) * 100;
    if (overPlanPercent <= 5) return "attention";
    if (overPlanPercent <= 15) return "risk";
    return "critical";
  }

  return "normal";
}
