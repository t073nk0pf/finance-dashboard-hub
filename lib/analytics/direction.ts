import type { MetricDefinition, MetricDirection } from "@/lib/analytics/model";

export function getMetricDirection(metricDefinition?: Pick<MetricDefinition, "direction"> | null): MetricDirection {
  return metricDefinition?.direction ?? "neutral";
}

export function isPositiveVariance(direction: MetricDirection, planValue: number, factValue: number): boolean {
  if (direction === "higher_is_better") return factValue >= planValue;
  if (direction === "lower_is_better") return factValue <= planValue;
  return true;
}

export function calculateDirectionAwareVariance(
  planValue: number,
  factValue: number,
  direction: MetricDirection,
): number {
  const delta = factValue - planValue;
  if (direction === "neutral") return delta;
  return delta;
}
