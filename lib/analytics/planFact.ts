import { aggregateAnalyticsFacts, groupAggregatedFacts } from "@/lib/analytics/aggregation";
import { calculateDirectionAwareVariance, getMetricDirection, isPositiveVariance } from "@/lib/analytics/direction";
import type { DashboardFilters } from "@/lib/analytics/filters";
import { createPrismaAnalyticsRepository } from "@/lib/analytics/repository";
import { calculatePlanFactStatus } from "@/lib/analytics/status";
import type { MetricDefinition } from "@/lib/analytics/model";
import type { PlanFactInput, PlanFactResult, PlanFactRow, PlanFactSummary } from "@/lib/analytics/types";

function buildSummary(rows: PlanFactRow[]): PlanFactSummary {
  return {
    rowsTotal: rows.length,
    normalCount: rows.filter((row) => row.status === "normal").length,
    attentionCount: rows.filter((row) => row.status === "attention").length,
    riskCount: rows.filter((row) => row.status === "risk").length,
    criticalCount: rows.filter((row) => row.status === "critical").length,
    noDataCount: rows.filter((row) => row.status === "no_data").length,
  };
}

function completionPercent(planValue: number, factValue: number): number | null {
  if (!Number.isFinite(planValue) || planValue === 0) return null;
  return (factValue / planValue) * 100;
}

function variancePercent(planValue: number, varianceValue: number): number | null {
  if (!Number.isFinite(planValue) || planValue === 0) return null;
  return (varianceValue / planValue) * 100;
}

function buildMetricMap(definitions: MetricDefinition[]): Map<string, MetricDefinition> {
  return new Map(definitions.map((definition) => [definition.key, definition]));
}

function passesFilters(row: { metricKey: string; article?: string | null }, input: PlanFactInput): boolean {
  const metricSet = input.metrics?.length ? new Set(input.metrics) : null;
  const articleSet = input.articles?.length ? new Set(input.articles) : null;

  if (metricSet && !metricSet.has(row.metricKey)) return false;
  if (articleSet && !articleSet.has(row.article ?? "")) return false;
  return true;
}

export async function calculatePlanFact(input: PlanFactInput): Promise<PlanFactResult> {
  const repository = createPrismaAnalyticsRepository();
  const filters: DashboardFilters = input.filters;
  const facts = await repository.findFacts(filters);
  const metricDefinitions = await repository.listMetricDefinitions();
  const metricMap = buildMetricMap(metricDefinitions);

  const filteredFacts = facts.filter((fact) =>
    passesFilters(
      {
        metricKey: fact.metricKey,
        article: fact.article,
      },
      input,
    ),
  );

  if (filteredFacts.length === 0) {
    return {
      filters,
      groupBy: input.groupBy ?? "total",
      rows: [],
      summary: buildSummary([]),
      generatedAt: new Date().toISOString(),
    };
  }

  const groupedFactsInput = {
    filters,
    groupBy: input.groupBy ?? "total",
    metrics: input.metrics,
    articles: input.articles,
    includeForecast: input.includeForecast,
  } satisfies PlanFactInput;

  const aggregated = aggregateAnalyticsFacts(filteredFacts, filters);
  const grouped = groupAggregatedFacts(aggregated.points, groupedFactsInput.groupBy ?? "total");

  const rows = grouped.map((bucket) => {
    const metricDefinition = metricMap.get(bucket.metricKey);
    const direction = getMetricDirection(metricDefinition);
    const varianceValue = calculateDirectionAwareVariance(bucket.planValue, bucket.factValue, direction);
    const variancePct = variancePercent(bucket.planValue, varianceValue);
    const completionPct = completionPercent(bucket.planValue, bucket.factValue);
    const status = calculatePlanFactStatus({
      planValue: bucket.planValue,
      factValue: bucket.factValue,
      varianceValue,
      variancePercent: variancePct,
      completionPercent: completionPct,
      direction,
      metricKey: bucket.metricKey,
    });

    return {
      key: bucket.key,
      label: bucket.label,
      country: bucket.country,
      region: bucket.region,
      unitId: bucket.unitId,
      metricKey: bucket.metricKey,
      metricName: metricDefinition?.name ?? bucket.metricKey,
      article: bucket.article,
      planValue: bucket.planValue,
      factValue: bucket.factValue,
      varianceValue,
      variancePercent: variancePct,
      completionPercent: completionPct,
      direction,
      status,
      impact: isPositiveVariance(direction, bucket.planValue, bucket.factValue) ? Math.abs(varianceValue) : -Math.abs(varianceValue),
      period: {
        from: filters.dateRange.from,
        to: filters.dateRange.to,
      },
    } satisfies PlanFactRow;
  });

  return {
    filters,
    groupBy: groupedFactsInput.groupBy ?? "total",
    rows,
    summary: buildSummary(rows),
    generatedAt: new Date().toISOString(),
  };
}
