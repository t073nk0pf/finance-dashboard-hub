import type { DashboardFilters } from "@/lib/analytics/filters";
import type { AnalyticsFact } from "@/lib/analytics/model";

export type AggregatedMetricPoint = {
  periodKey: string;
  metricKey: string;
  fact?: number;
  plan?: number;
  forecast?: number;
  businessPlan?: number;
};

export type AggregationResult = {
  filters: DashboardFilters;
  points: AggregatedMetricPoint[];
};

export function aggregateAnalyticsFacts(facts: AnalyticsFact[], filters: DashboardFilters): AggregationResult {
  if (facts.length === 0) {
    return { filters, points: [] };
  }

  return {
    filters,
    points: [],
  };
}

export function aggregateFacts(facts: AnalyticsFact[], filters: DashboardFilters): AggregationResult {
  return aggregateAnalyticsFacts(facts, filters);
}
