import type { DashboardFilters } from "@/lib/analytics/filters";
import type { MetricDirection } from "@/lib/analytics/model";

export type ForecastScenario = "pessimistic" | "base" | "optimistic";
export type ForecastMethod = "current_pace" | "plan_distribution" | "previous_period" | "manual";
export type ForecastStatus = "on_track" | "attention" | "risk" | "critical" | "no_data";

export type ForecastInput = {
  filters: DashboardFilters;
  metrics?: string[];
  scenarios?: ForecastScenario[];
  asOfDate?: string;
  method?: ForecastMethod;
};

export type ForecastMetricResult = {
  metricKey: string;
  metricName?: string;
  scenario: ForecastScenario;
  method: ForecastMethod;
  actualToDate: number;
  planToDate?: number;
  forecastRemaining: number;
  forecastTotal: number;
  planTotal?: number;
  varianceToPlan?: number;
  varianceToPlanPercent?: number;
  confidence?: number;
  status?: ForecastStatus;
  meta?: Record<string, unknown>;
};

export type ForecastSummary = {
  rowsTotal: number;
  metricsCount: number;
  scenariosCount: number;
  hasPlanComparison: boolean;
  generatedAt: string;
};

export type ForecastResult = {
  filters: DashboardFilters;
  asOfDate: string;
  period: {
    from: string;
    to: string;
  };
  scenarios: ForecastScenario[];
  rows: ForecastMetricResult[];
  summary: ForecastSummary;
  generatedAt: string;
};

export type ForecastMetricContext = {
  metricKey: string;
  metricName?: string;
  direction: MetricDirection;
  actualToDate: number;
  planToDate?: number;
  planTotal?: number;
  elapsedDays: number;
  totalDays: number;
  remainingDays: number;
};
