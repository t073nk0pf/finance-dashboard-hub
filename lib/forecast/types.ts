import type { AnalyticsFact, DateRange, MetricDefinition } from "@/lib/analytics/model";

export type ForecastScenario = "base" | "optimistic" | "pessimistic";

export type ForecastInput = {
  facts: AnalyticsFact[];
  plan: AnalyticsFact[];
  dateRange: DateRange;
  metricDefinitions: MetricDefinition[];
};

export type ForecastMetricResult = {
  scenario: ForecastScenario;
  metricKey: string;
  value: number;
  confidence?: number;
  meta?: Record<string, unknown>;
};

export type ForecastResult = {
  scenario: ForecastScenario;
  metricKey: string;
  value: number;
  confidence?: number;
  meta?: Record<string, unknown>;
};
