import { parseDashboardQueryParams } from "../lib/dashboard/queryFilters.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCase(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

runCase("defaults for empty params", () => {
  const parsed = parseDashboardQueryParams(new URLSearchParams());
  assert(parsed.filters.country === "all", "country default should be all");
  assert(parsed.filters.region === "all", "region default should be all");
  assert(parsed.filters.aggregationMode === "period", "aggregationMode default should be period");
  assert(parsed.filters.compareMode === "plan", "compareMode default should be plan");
  assert(parsed.groupBy === "metric", "groupBy default should be metric");
  assert(parsed.filters.valueTypes.length > 0, "valueTypes defaults should exist");
});

runCase("valid params parse", () => {
  const params = new URLSearchParams({
    country: "armenia",
    from: "2026-05-01",
    to: "2026-05-31",
    groupBy: "metric",
    metrics: "revenue,ebitda",
  });
  const parsed = parseDashboardQueryParams(params);
  assert(parsed.filters.country === "armenia", "country should parse");
  assert(parsed.filters.dateRange.from === "2026-05-01", "from should parse");
  assert(parsed.filters.dateRange.to === "2026-05-31", "to should parse");
  assert(parsed.groupBy === "metric", "groupBy should parse");
  assert(parsed.metrics?.length === 2, "metrics should parse as CSV");
});

runCase("invalid date does not crash and adds warning", () => {
  const parsed = parseDashboardQueryParams(new URLSearchParams({ from: "not-a-date" }));
  assert(parsed.warnings.includes("invalid_query_params"), "invalid date should set warning");
});

runCase("from > to falls back to default range with warning", () => {
  const parsed = parseDashboardQueryParams(
    new URLSearchParams({ from: "2026-06-01", to: "2026-05-01" }),
  );
  assert(parsed.warnings.includes("invalid_date_range"), "invalid range should set warning");
  assert(parsed.filters.dateRange.from <= parsed.filters.dateRange.to, "dateRange must stay valid");
});

runCase("invalid aggregation mode falls back to default", () => {
  const parsed = parseDashboardQueryParams(new URLSearchParams({ aggregationMode: "broken-mode" }));
  assert(parsed.warnings.includes("invalid_aggregation_mode"), "invalid aggregation mode should set warning");
  assert(parsed.filters.aggregationMode === "period", "invalid aggregation mode should fallback to period");
});

runCase("csv fields trim and remove empty values", () => {
  const parsed = parseDashboardQueryParams(new URLSearchParams({ metrics: " revenue, , ebitda ,, " }));
  assert(parsed.metrics?.length === 2, "csv parser should drop empty tokens");
  assert(parsed.metrics?.[0] === "revenue", "first metric should be revenue");
  assert(parsed.metrics?.[1] === "ebitda", "second metric should be ebitda");
});

if (process.exitCode && process.exitCode !== 0) {
  console.error("Query filters contract checks failed.");
  process.exit(process.exitCode);
}

console.log("Query filters contract checks passed.");
