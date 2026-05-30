import type { DashboardFilters } from "@/lib/analytics/filters";
import type { AnalyticsFact } from "@/lib/analytics/model";

export type ForecastScenarioName = "base" | "optimistic" | "negative";

export type ForecastInput = {
  filters: DashboardFilters;
  facts: AnalyticsFact[];
  scenario: ForecastScenarioName;
};

export type ForecastMetricResult = {
  metricKey: string;
  forecastValue: number;
  confidence?: number;
  notes?: string[];
};

export type ForecastResult = {
  scenario: ForecastScenarioName;
  metrics: ForecastMetricResult[];
};
