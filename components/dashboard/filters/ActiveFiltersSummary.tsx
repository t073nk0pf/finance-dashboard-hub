"use client";

import { useMemo } from "react";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

function titleCase(value: string): string {
  if (!value) return value;
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ActiveFiltersSummary() {
  const { filters } = useDashboardFilters();

  const hasDefaultScope = filters.country === "all" && filters.region === "all" && !filters.unitId;
  const hasDefaultModes = filters.aggregationMode === "period" && filters.compareMode === "plan";
  const hasExtraLists = filters.metrics.length > 0 || filters.articles.length > 0;
  const hasForecastOptions =
    !!filters.asOfDate ||
    filters.method !== "current_pace" ||
    (filters.scenarios.length > 0 && !(filters.scenarios.length === 3 && filters.scenarios.includes("pessimistic") && filters.scenarios.includes("base") && filters.scenarios.includes("optimistic")));
  const isDefault = hasDefaultScope && hasDefaultModes && !hasExtraLists && !hasForecastOptions;

  const summaryText = useMemo(() => {
    if (isDefault) {
      return "Default scope / Current period";
    }

    const parts: string[] = [];
    parts.push(`Country: ${filters.country}`);
    if (filters.region !== "all") parts.push(`Region: ${filters.region}`);
    if (filters.unitId) parts.push(`Unit: ${filters.unitId}`);
    parts.push(`Period: ${filters.dateRange.from} -> ${filters.dateRange.to}`);
    parts.push(`Mode: ${filters.aggregationMode}`);
    parts.push(`Compare: ${filters.compareMode}`);
    if (filters.metrics.length) parts.push(`Metrics: ${filters.metrics.join(", ")}`);
    if (filters.articles.length) parts.push(`Articles: ${filters.articles.join(", ")}`);
    if (filters.asOfDate) parts.push(`As of: ${filters.asOfDate}`);
    if (filters.scenarios.length) parts.push(`Scenarios: ${filters.scenarios.join(", ")}`);
    if (filters.method) parts.push(`Method: ${filters.method}`);
    return parts.join(" · ");
  }, [filters, isDefault]);

  return (
    <section className="rounded-lg border border-line bg-surface px-3 py-2 shadow-soft">
      <div className="text-xs text-muted">
        <span className="font-semibold text-ink">Active filters:</span> {summaryText}
      </div>
      {!isDefault ? (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">{titleCase(filters.country)}</span>
          {filters.region !== "all" ? <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">{titleCase(filters.region)}</span> : null}
          {filters.unitId ? <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">{filters.unitId}</span> : null}
          <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">{filters.dateRange.from}{" -> "}{filters.dateRange.to}</span>
          <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">{filters.aggregationMode}</span>
          <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">{filters.compareMode}</span>
          {filters.asOfDate ? <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">asOf: {filters.asOfDate}</span> : null}
          {filters.scenarios.length ? (
            <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">scenarios: {filters.scenarios.join(",")}</span>
          ) : null}
          {filters.method ? <span className="rounded border border-line bg-surface2 px-2 py-0.5 text-xs text-ink">method: {filters.method}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
