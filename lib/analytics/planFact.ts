import type { DashboardFilters } from "@/lib/analytics/filters";
import { NotImplementedError } from "@/lib/analytics/model";

export type PlanFactMetricResult = {
  metricKey: string;
  plan: number;
  fact: number;
  deviation: number;
  achievement: number | null;
};

export type PlanFactResult = {
  filters: DashboardFilters;
  metrics: PlanFactMetricResult[];
};

export async function calculatePlanFact(filters: DashboardFilters): Promise<PlanFactResult> {
  void filters;
  throw new NotImplementedError("Plan-fact engine is not implemented yet");
}
