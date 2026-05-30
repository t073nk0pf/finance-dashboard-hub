import type { DashboardFilters } from "@/lib/analytics/filters";
import type { MetricDirection } from "@/lib/analytics/model";

export type PlanFactGroupBy =
  | "total"
  | "country"
  | "region"
  | "unit"
  | "article"
  | "metric"
  | "month"
  | "week"
  | "day";

export type PlanFactStatus = "normal" | "attention" | "risk" | "critical" | "no_data";

export type PlanFactInput = {
  filters: DashboardFilters;
  groupBy?: PlanFactGroupBy;
  metrics?: string[];
  articles?: string[];
  includeForecast?: boolean;
};

export type PlanFactRow = {
  key: string;
  label: string;
  country?: string;
  region?: string | null;
  unitId?: string | null;
  unitName?: string;
  metricKey: string;
  metricName?: string;
  article?: string | null;
  planValue: number;
  factValue: number;
  varianceValue: number;
  variancePercent: number | null;
  completionPercent: number | null;
  direction: MetricDirection;
  status: PlanFactStatus;
  impact?: number;
  period: {
    from: string;
    to: string;
  };
};

export type PlanFactSummary = {
  rowsTotal: number;
  normalCount: number;
  attentionCount: number;
  riskCount: number;
  criticalCount: number;
  noDataCount: number;
};

export type PlanFactResult = {
  filters: DashboardFilters;
  groupBy: PlanFactGroupBy;
  rows: PlanFactRow[];
  summary: PlanFactSummary;
  generatedAt: string;
};
