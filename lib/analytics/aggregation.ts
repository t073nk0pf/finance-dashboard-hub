import type { DashboardFilters } from "@/lib/analytics/filters";
import type { AnalyticsFact, AnalyticsValueType } from "@/lib/analytics/model";
import type { PlanFactGroupBy } from "@/lib/analytics/types";

export type AggregatedMetricPoint = {
  periodKey: string;
  metricKey: string;
  article?: string | null;
  country?: string;
  region?: string | null;
  unitId?: string | null;
  valueType: AnalyticsValueType;
  value: number;
};

export type AggregationResult = {
  filters: DashboardFilters;
  points: AggregatedMetricPoint[];
};

function monthKey(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function byPeriodMode(fact: AnalyticsFact, filters: DashboardFilters): string {
  if (filters.aggregationMode === "monthly") return monthKey(fact.date);
  return "period";
}

export function aggregateAnalyticsFacts(facts: AnalyticsFact[], filters: DashboardFilters): AggregationResult {
  if (facts.length === 0) return { filters, points: [] };

  const map = new Map<string, AggregatedMetricPoint>();

  for (const fact of facts) {
    const periodKey = byPeriodMode(fact, filters);
    const key = `${periodKey}::${fact.metricKey}::${fact.article ?? ""}::${fact.country}::${fact.region ?? ""}::${fact.unitId ?? ""}::${fact.valueType}`;

    const current = map.get(key);
    if (current) {
      current.value += fact.value;
      continue;
    }

    map.set(key, {
      periodKey,
      metricKey: fact.metricKey,
      article: fact.article,
      country: fact.country,
      region: fact.region,
      unitId: fact.unitId,
      valueType: fact.valueType,
      value: fact.value,
    });
  }

  return {
    filters,
    points: Array.from(map.values()),
  };
}

export function aggregateFacts(facts: AnalyticsFact[], filters: DashboardFilters): AggregationResult {
  return aggregateAnalyticsFacts(facts, filters);
}

export type GroupedFactBucket = {
  key: string;
  label: string;
  metricKey: string;
  article?: string | null;
  country?: string;
  region?: string | null;
  unitId?: string | null;
  planValue: number;
  factValue: number;
};

function bucketKey(groupBy: PlanFactGroupBy, point: AggregatedMetricPoint): string {
  if (groupBy === "country") return `${point.country ?? "all"}::${point.metricKey}`;
  if (groupBy === "region") return `${point.country ?? "all"}::${point.region ?? "all"}::${point.metricKey}`;
  if (groupBy === "unit") return `${point.unitId ?? "unknown"}::${point.metricKey}`;
  if (groupBy === "article") return `${point.article ?? "none"}::${point.metricKey}`;
  if (groupBy === "metric") return point.metricKey;
  if (groupBy === "month" || groupBy === "week" || groupBy === "day") return `${point.periodKey}::${point.metricKey}`;
  return `total::${point.metricKey}`;
}

function bucketLabel(groupBy: PlanFactGroupBy, point: AggregatedMetricPoint): string {
  if (groupBy === "country") return point.country ?? "All countries";
  if (groupBy === "region") return point.region ?? "All regions";
  if (groupBy === "unit") return point.unitId ?? "Unknown unit";
  if (groupBy === "article") return point.article ?? "No article";
  if (groupBy === "metric") return point.metricKey;
  if (groupBy === "month" || groupBy === "week" || groupBy === "day") return point.periodKey;
  return "Total";
}

export function groupAggregatedFacts(points: AggregatedMetricPoint[], groupBy: PlanFactGroupBy): GroupedFactBucket[] {
  const buckets = new Map<string, GroupedFactBucket>();

  for (const point of points) {
    const key = bucketKey(groupBy, point);
    const current = buckets.get(key) ?? {
      key,
      label: bucketLabel(groupBy, point),
      metricKey: point.metricKey,
      article: point.article,
      country: point.country,
      region: point.region,
      unitId: point.unitId,
      planValue: 0,
      factValue: 0,
    };

    if (point.valueType === "plan" || point.valueType === "business_plan") current.planValue += point.value;
    if (point.valueType === "fact") current.factValue += point.value;

    buckets.set(key, current);
  }

  return Array.from(buckets.values());
}
