"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import type { DashboardFilterConfig, DashboardFilterState } from "@/lib/dashboard/filters/types";

type FilterConfigResponse = {
  config: DashboardFilterConfig;
};

const METRIC_OPTIONS = ["revenue", "ebitda", "uc", "dc", "labor", "rent", "marketing", "write_offs"] as const;
const DEFAULT_GROUP_BY_OPTIONS = ["metric", "unit", "article", "month"] as const;

function dedupeCsv(values: string[]): string[] {
  const set = new Set<string>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    set.add(value);
  }
  return [...set];
}

function parseCsv(value: string): string[] {
  return dedupeCsv(value.split(","));
}

export function ArmeniaAdvancedFilterControls() {
  const { filters, setFilters } = useDashboardFilters();
  const [config, setConfig] = useState<DashboardFilterConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<DashboardFilterState["groupBy"]>(filters.groupBy);
  const [metrics, setMetrics] = useState<string[]>(filters.metrics);
  const [articlesInput, setArticlesInput] = useState(filters.articles.join(","));

  useEffect(() => {
    setGroupBy(filters.groupBy);
    setMetrics(filters.metrics);
    setArticlesInput(filters.articles.join(","));
  }, [filters.articles, filters.groupBy, filters.metrics]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadConfig() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/dashboard-filters/config", {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Filter config request failed: ${response.status}`);
        const payload = (await response.json()) as FilterConfigResponse;
        if (!active) return;
        setConfig(payload.config);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load filter config");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadConfig();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const groupByOptions = useMemo(() => {
    const options = config?.groupByOptions.map((item) => item.value) ?? [...DEFAULT_GROUP_BY_OPTIONS];
    return options.filter((value, index, array) => array.indexOf(value) === index);
  }, [config]);

  const normalizedMetrics = useMemo(() => dedupeCsv(metrics), [metrics]);
  const normalizedArticles = useMemo(() => parseCsv(articlesInput), [articlesInput]);

  const groupByValid = groupByOptions.includes(groupBy);
  const applyDisabled = !groupByValid;

  return (
    <section className="rounded-lg border border-line bg-surface p-3 shadow-soft">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted">Armenia options (pilot)</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-muted">
          Group by
          <select
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as DashboardFilterState["groupBy"])}
          >
            {groupByOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          Metrics
          <select
            multiple
            className="mt-1 h-[84px] w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={metrics}
            onChange={(event) => {
              const next = Array.from(event.target.selectedOptions).map((option) => option.value);
              setMetrics(dedupeCsv(next));
            }}
          >
            {METRIC_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          Articles (CSV)
          <input
            type="text"
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={articlesInput}
            onChange={(event) => setArticlesInput(event.target.value)}
            placeholder="food_cost,labor"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded border border-line bg-navy px-3 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={applyDisabled}
          onClick={() =>
            setFilters({
              groupBy,
              metrics: normalizedMetrics,
              articles: normalizedArticles,
            })
          }
        >
          Apply
        </button>
        <button
          type="button"
          className="rounded border border-line bg-surface2 px-3 py-1 text-sm font-semibold text-ink"
          onClick={() =>
            setFilters({
              groupBy: "metric",
              metrics: [],
              articles: [],
            })
          }
        >
          Reset Armenia options
        </button>
        {loading ? <span className="text-xs text-muted">Loading Armenia options...</span> : null}
        {error ? <span className="text-xs text-negative">Config error: {error}</span> : null}
        {!error && !groupByValid ? <span className="text-xs text-warning">Некорректный groupBy.</span> : null}
      </div>
    </section>
  );
}
