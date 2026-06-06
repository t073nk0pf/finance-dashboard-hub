import type { PlanFactResult } from "@/lib/analytics/types";
import type { DashboardPlanFactApiResponse } from "@/lib/dashboard/types";
import type { DashboardMetric } from "@/types/dashboard";

type MetricPatch = {
  plan: number;
  fact: number;
};

const metricAliases: Record<string, string> = {
  "net-profit": "netProfit",
  net_profit: "netProfit",
  food_cost: "foodCost",
  other_opex: "otherOpex",
};

function resolveMetricKey(metricKey: string): string {
  return metricAliases[metricKey] ?? metricKey;
}

function buildMetricPatches(planFact: PlanFactResult): Map<string, MetricPatch> {
  const patches = new Map<string, MetricPatch>();

  for (const row of planFact.rows) {
    const key = resolveMetricKey(row.metricKey);
    const current = patches.get(key) ?? { plan: 0, fact: 0 };
    current.plan += row.planValue;
    current.fact += row.factValue;
    patches.set(key, current);
  }

  return patches;
}

function applyMetricPatch(metric: DashboardMetric, patch: MetricPatch): DashboardMetric {
  const delta = patch.fact - patch.plan;
  const deltaRatio = patch.plan === 0 ? null : delta / patch.plan;

  return {
    ...metric,
    plan: patch.plan,
    fact: patch.fact,
    delta,
    deltaRatio,
  };
}

export function adaptPlanFactToDashboardData(
  fallback: DashboardPlanFactApiResponse,
  planFact: PlanFactResult,
): DashboardPlanFactApiResponse {
  const patches = buildMetricPatches(planFact);
  if (!patches.size) return fallback;

  const metrics = Object.fromEntries(
    Object.entries(fallback.metrics).map(([key, metric]) => {
      const patch = patches.get(key);
      if (!patch) return [key, metric];
      return [key, applyMetricPatch(metric, patch)];
    }),
  ) as DashboardPlanFactApiResponse["metrics"];

  return {
    ...fallback,
    metrics,
  };
}
