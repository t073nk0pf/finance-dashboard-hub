import assert from "node:assert/strict";
import { filtersToSearchParams, searchParamsToFilters, buildDashboardUrl } from "../lib/dashboard/filters/urlState.ts";
import { getDashboardFilterPresets } from "../lib/dashboard/filters/presets.ts";
import { getDashboardFilterConfig } from "../lib/dashboard/filters/config.ts";

function run() {
  const params = new URLSearchParams();
  const defaults = searchParamsToFilters(params, new Date("2026-05-17T00:00:00Z"));
  assert.ok(defaults.dateRange.from);
  assert.ok(defaults.dateRange.to);
  assert.equal(defaults.country, "all");

  const sourceFilters = {
    ...defaults,
    country: "armenia",
    region: "yerevan",
    metrics: ["revenue", "ebitda", ""],
    articles: ["food", "dc"],
    scenarios: ["base", "optimistic", "pessimistic"],
    asOfDate: "2026-05-17",
  };

  const search = filtersToSearchParams(sourceFilters);
  const roundtrip = searchParamsToFilters(search, new Date("2026-05-17T00:00:00Z"));
  assert.equal(roundtrip.country, "armenia");
  assert.equal(roundtrip.region, "yerevan");
  assert.deepEqual(roundtrip.metrics.sort(), ["ebitda", "revenue"]);
  assert.deepEqual(roundtrip.articles.sort(), ["dc", "food"]);

  const emptySearch = filtersToSearchParams({
    ...defaults,
    country: "all",
    region: "all",
    metrics: [],
    articles: [],
  });
  assert.equal(emptySearch.has("metrics"), false);
  assert.equal(emptySearch.has("articles"), false);
  assert.equal(emptySearch.has("country"), false);

  const presets = getDashboardFilterPresets(new Date("2026-05-17T00:00:00Z"));
  assert.ok(presets.find((preset) => preset.id === "currentMonth"));
  assert.ok(presets.find((preset) => preset.id === "armeniaCurrentMonth"));
  assert.ok(presets.find((preset) => preset.id === "forecastCurrentMonth"));

  const config = getDashboardFilterConfig({ country: "armenia" });
  assert.ok(config.countries.length >= 3);
  assert.ok(config.aggregationModes.length >= 5);
  assert.ok(config.compareModes.length >= 6);
  assert.ok(config.groupByOptions.length >= 9);
  assert.ok(config.valueTypeOptions.length >= 4);

  const url = buildDashboardUrl("/dashboards/plan-fact", {
    country: "armenia",
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
    metrics: ["revenue", "ebitda"],
  });
  assert.ok(url.includes("/dashboards/plan-fact?"));
  assert.ok(url.includes("country=armenia"));
  assert.ok(url.includes("from=2026-05-01"));
  assert.ok(url.includes("to=2026-05-31"));

  console.log("Dashboard filter foundation checks passed.");
}

run();
