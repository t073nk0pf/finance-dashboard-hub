import type { AggregationMode, CompareMode, DashboardFilters } from "@/lib/analytics/filters";
import { normalizeDashboardFilters } from "@/lib/analytics/filters";
import type { AnalyticsValueType } from "@/lib/analytics/model";
import type { ForecastMethod, ForecastScenario } from "@/lib/forecast/types";
import type { PlanFactGroupBy } from "@/lib/analytics/types";

export type DashboardQueryReason =
  | "invalid_query_params"
  | "invalid_date_range"
  | "invalid_aggregation_mode"
  | "invalid_compare_mode"
  | "invalid_group_by"
  | "invalid_value_types"
  | "invalid_method"
  | "invalid_scenarios";

export type DashboardQueryParseResult = {
  filters: DashboardFilters;
  groupBy: PlanFactGroupBy;
  metrics?: string[];
  articles?: string[];
  asOfDate?: string;
  scenarios?: ForecastScenario[];
  method: ForecastMethod;
  warnings: DashboardQueryReason[];
};

const aggregationModes: AggregationMode[] = ["period", "cumulative", "daily", "weekly", "monthly"];
const compareModes: CompareMode[] = ["plan", "previous_period", "previous_month", "previous_year", "custom_period", "none"];
const groupByModes: PlanFactGroupBy[] = ["total", "country", "region", "unit", "article", "metric", "month", "week", "day"];
const valueTypes: AnalyticsValueType[] = ["fact", "plan", "forecast", "business_plan"];
const forecastScenarios: ForecastScenario[] = ["pessimistic", "base", "optimistic"];
const forecastMethods: ForecastMethod[] = ["current_pace", "plan_distribution", "previous_period", "manual"];

function currentMonthRange(today = new Date()): { from: string; to: string } {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function getDefaultDashboardFilters(): DashboardFilters {
  const month = currentMonthRange();
  return normalizeDashboardFilters({
    country: "all",
    region: "all",
    unitId: undefined,
    dateRange: month,
    aggregationMode: "period",
    compareMode: "plan",
    valueTypes: ["fact", "plan", "forecast", "business_plan"],
  });
}

function parseCsv(searchParams: URLSearchParams, key: string): string[] | undefined {
  const value = searchParams.get(key);
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length ? parsed : undefined;
}

function parseDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export function parseDashboardQueryParams(searchParams: URLSearchParams): DashboardQueryParseResult {
  const warnings: DashboardQueryReason[] = [];
  const defaults = getDefaultDashboardFilters();

  const parsedFrom = parseDate(searchParams.get("from"));
  const parsedTo = parseDate(searchParams.get("to"));
  const asOfDate = parseDate(searchParams.get("asOfDate"));

  if (searchParams.get("from") && !parsedFrom) warnings.push("invalid_query_params");
  if (searchParams.get("to") && !parsedTo) warnings.push("invalid_query_params");
  if (searchParams.get("asOfDate") && !asOfDate) warnings.push("invalid_query_params");

  const from = parsedFrom ?? defaults.dateRange.from;
  const to = parsedTo ?? defaults.dateRange.to;
  if (new Date(from) > new Date(to)) warnings.push("invalid_date_range");

  const aggregationMode = searchParams.get("aggregationMode") as AggregationMode | null;
  const compareMode = searchParams.get("compareMode") as CompareMode | null;
  const groupBy = searchParams.get("groupBy") as PlanFactGroupBy | null;
  const method = searchParams.get("method") as ForecastMethod | null;

  if (aggregationMode && !aggregationModes.includes(aggregationMode)) warnings.push("invalid_aggregation_mode");
  if (compareMode && !compareModes.includes(compareMode)) warnings.push("invalid_compare_mode");
  if (groupBy && !groupByModes.includes(groupBy)) warnings.push("invalid_group_by");
  if (method && !forecastMethods.includes(method)) warnings.push("invalid_method");

  const rawValueTypes = parseCsv(searchParams, "valueTypes");
  const parsedValueTypes = rawValueTypes?.filter((value): value is AnalyticsValueType =>
    valueTypes.includes(value as AnalyticsValueType),
  );
  if (rawValueTypes && !parsedValueTypes?.length) warnings.push("invalid_value_types");

  const rawScenarios = parseCsv(searchParams, "scenarios");
  const parsedScenarios = rawScenarios?.filter((value): value is ForecastScenario =>
    forecastScenarios.includes(value as ForecastScenario),
  );
  if (rawScenarios && !parsedScenarios?.length) warnings.push("invalid_scenarios");

  const filters = normalizeDashboardFilters({
    country: searchParams.get("country") ?? defaults.country,
    region: searchParams.get("region") ?? defaults.region,
    unitId: searchParams.get("unitId") ?? defaults.unitId,
    dateRange: new Date(from) <= new Date(to) ? { from, to } : defaults.dateRange,
    aggregationMode: aggregationModes.includes(aggregationMode as AggregationMode)
      ? (aggregationMode as AggregationMode)
      : defaults.aggregationMode,
    compareMode: compareModes.includes(compareMode as CompareMode) ? (compareMode as CompareMode) : defaults.compareMode,
    valueTypes: parsedValueTypes?.length ? parsedValueTypes : defaults.valueTypes,
  });

  return {
    filters,
    groupBy: groupByModes.includes(groupBy as PlanFactGroupBy) ? (groupBy as PlanFactGroupBy) : "metric",
    metrics: parseCsv(searchParams, "metrics"),
    articles: parseCsv(searchParams, "articles"),
    asOfDate,
    scenarios: parsedScenarios,
    method: forecastMethods.includes(method as ForecastMethod) ? (method as ForecastMethod) : "current_pace",
    warnings: warnings.filter((value, index, array) => array.indexOf(value) === index),
  };
}
