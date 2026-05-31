import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import type { DashboardFilterState } from "@/lib/dashboard/filters/types";
import { normalizeForecastAdvancedFilters } from "@/lib/dashboard/filters/validation";

function toDateOnly(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function serializeCsv(values: string[] | undefined): string | undefined {
  if (!values?.length) return undefined;
  const cleaned = values.map((item) => item.trim()).filter(Boolean);
  if (!cleaned.length) return undefined;
  return [...cleaned].sort().join(",");
}

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function searchParamsToFilters(searchParams: URLSearchParams): DashboardFilterState {
  const parsed = parseDashboardQueryParams(searchParams);
  const normalizedForecastAdvanced = normalizeForecastAdvancedFilters({
    asOfDate: parsed.asOfDate,
    scenarios: parsed.scenarios,
    method: parsed.method,
  });

  return {
    country: (parsed.filters.country as DashboardFilterState["country"]) ?? "all",
    region: parsed.filters.region ?? "all",
    unitId: parsed.filters.unitId ?? undefined,
    dateRange: {
      from: parsed.filters.dateRange.from,
      to: parsed.filters.dateRange.to,
    },
    aggregationMode: parsed.filters.aggregationMode,
    compareMode: parsed.filters.compareMode,
    groupBy: parsed.groupBy,
    metrics: parsed.metrics ?? [],
    articles: parsed.articles ?? [],
    valueTypes: parsed.filters.valueTypes,
    asOfDate: normalizedForecastAdvanced.asOfDate,
    scenarios: normalizedForecastAdvanced.scenarios ?? ["pessimistic", "base", "optimistic"],
    method: normalizedForecastAdvanced.method ?? "current_pace",
  };
}

export function filtersToSearchParams(filters: Partial<DashboardFilterState>): URLSearchParams {
  const params = new URLSearchParams();
  const from = toDateOnly(filters.dateRange?.from);
  const to = toDateOnly(filters.dateRange?.to);
  const asOfDate = toDateOnly(filters.asOfDate);

  if (filters.country && filters.country !== "all") params.set("country", filters.country);
  if (filters.region && filters.region !== "all") params.set("region", filters.region);
  if (filters.unitId) params.set("unitId", filters.unitId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (filters.aggregationMode) params.set("aggregationMode", filters.aggregationMode);
  if (filters.compareMode && filters.compareMode !== "none") params.set("compareMode", filters.compareMode);
  if (filters.groupBy && filters.groupBy !== "metric") params.set("groupBy", filters.groupBy);
  if (asOfDate) params.set("asOfDate", asOfDate);
  if (filters.method) params.set("method", filters.method);

  const metrics = serializeCsv(filters.metrics);
  const articles = serializeCsv(filters.articles);
  const valueTypes = serializeCsv(filters.valueTypes);
  const scenarios = serializeCsv(filters.scenarios);

  if (metrics) params.set("metrics", metrics);
  if (articles) params.set("articles", articles);
  if (valueTypes) params.set("valueTypes", valueTypes);
  if (scenarios) params.set("scenarios", scenarios);

  return params;
}

export function mergeFiltersWithSearchParams(filters: Partial<DashboardFilterState>, searchParams: URLSearchParams): DashboardFilterState {
  const current = searchParamsToFilters(searchParams);
  return {
    ...current,
    ...filters,
    dateRange: {
      ...current.dateRange,
      ...(filters.dateRange ?? {}),
    },
  };
}

export function getFilterPatchFromSearchParams(searchParams: URLSearchParams): Partial<DashboardFilterState> {
  const patch: Partial<DashboardFilterState> = {};
  const from = toDateOnly(searchParams.get("from") ?? undefined);
  const to = toDateOnly(searchParams.get("to") ?? undefined);

  if (searchParams.get("country")) patch.country = searchParams.get("country") as DashboardFilterState["country"];
  if (searchParams.get("region")) patch.region = searchParams.get("region") ?? "all";
  if (searchParams.get("unitId")) patch.unitId = searchParams.get("unitId") ?? undefined;
  if (from || to) {
    patch.dateRange = {
      from: from ?? "",
      to: to ?? "",
    };
  }
  if (searchParams.get("aggregationMode")) patch.aggregationMode = searchParams.get("aggregationMode") as DashboardFilterState["aggregationMode"];
  if (searchParams.get("compareMode")) patch.compareMode = searchParams.get("compareMode") as DashboardFilterState["compareMode"];
  if (searchParams.get("groupBy")) patch.groupBy = searchParams.get("groupBy") as DashboardFilterState["groupBy"];
  const normalizedForecastAdvanced = normalizeForecastAdvancedFilters({
    asOfDate: searchParams.get("asOfDate") ?? undefined,
    method: searchParams.get("method") ?? undefined,
    scenarios: parseCsv(searchParams.get("scenarios")),
  });

  if (normalizedForecastAdvanced.asOfDate) patch.asOfDate = normalizedForecastAdvanced.asOfDate;
  if (normalizedForecastAdvanced.method) patch.method = normalizedForecastAdvanced.method;

  const metrics = parseCsv(searchParams.get("metrics"));
  const articles = parseCsv(searchParams.get("articles"));
  const valueTypes = parseCsv(searchParams.get("valueTypes"));
  const scenarios = normalizedForecastAdvanced.scenarios ?? [];

  if (metrics.length) patch.metrics = metrics;
  if (articles.length) patch.articles = articles;
  if (valueTypes.length) patch.valueTypes = valueTypes as DashboardFilterState["valueTypes"];
  if (scenarios.length) patch.scenarios = scenarios;

  return patch;
}

export function buildDashboardUrl(basePath: string, filters: Partial<DashboardFilterState>): string {
  const params = filtersToSearchParams(filters);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
