"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import type { DashboardFilterConfig, DashboardFilterState } from "@/lib/dashboard/filters/types";

type FilterConfigResponse = {
  filters: DashboardFilterState;
  config: DashboardFilterConfig;
  meta?: {
    warnings?: string[];
  };
};

const DEFAULT_CONFIG: DashboardFilterConfig = {
  countries: [
    { value: "all", label: "all" },
    { value: "armenia", label: "armenia" },
    { value: "russia", label: "russia" },
  ],
  regions: [],
  units: [],
  aggregationModes: ["period", "cumulative", "daily", "weekly", "monthly"].map((value) => ({ value, label: value })),
  compareModes: ["plan", "previous_period", "previous_month", "previous_year", "none"].map((value) => ({ value, label: value })),
  groupByOptions: [],
  valueTypeOptions: [],
  scenarioOptions: [],
  methodOptions: [],
};

function toInputDate(value?: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function DashboardFilterBar() {
  const { filters, setFilters, resetFilters } = useDashboardFilters();
  const [draft, setDraft] = useState<DashboardFilterState>(filters);
  const [config, setConfig] = useState<DashboardFilterConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadConfig() {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams();
        if (draft.country) query.set("country", draft.country);
        if (draft.region) query.set("region", draft.region);
        if (draft.unitId) query.set("unitId", draft.unitId);
        const response = await fetch(`/api/dashboard-filters/config?${query.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`Filter config request failed: ${response.status}`);
        const payload = (await response.json()) as FilterConfigResponse;
        if (!active) return;
        setConfig(payload.config ?? DEFAULT_CONFIG);
        setWarnings(payload.meta?.warnings ?? []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load filter config");
        setConfig(DEFAULT_CONFIG);
        setWarnings([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadConfig();
    return () => {
      active = false;
      controller.abort();
    };
  }, [draft.country, draft.region, draft.unitId]);

  const regionOptions = useMemo(() => [{ value: "all", label: "all" }, ...config.regions.filter((item) => item.value !== "all")], [config.regions]);
  const unitOptions = useMemo(() => [{ value: "all", label: "all" }, ...config.units.filter((item) => item.value !== "all")], [config.units]);

  return (
    <section className="rounded-lg border border-line bg-surface p-3 shadow-soft">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted">Dashboard filters (pilot)</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <label className="text-xs text-muted">
          Country
          <select
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={draft.country}
            onChange={(event) => setDraft((prev) => ({ ...prev, country: event.target.value as DashboardFilterState["country"], region: "all", unitId: undefined }))}
          >
            {config.countries.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          Region
          <select
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink disabled:opacity-50"
            value={draft.region}
            disabled={!regionOptions.length}
            onChange={(event) => setDraft((prev) => ({ ...prev, region: event.target.value, unitId: undefined }))}
          >
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          Unit
          <select
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink disabled:opacity-50"
            value={draft.unitId ?? "all"}
            disabled={!unitOptions.length}
            onChange={(event) => {
              const value = event.target.value;
              setDraft((prev) => ({ ...prev, unitId: value === "all" ? undefined : value }));
            }}
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          From
          <input
            type="date"
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={toInputDate(draft.dateRange.from)}
            onChange={(event) => setDraft((prev) => ({ ...prev, dateRange: { ...prev.dateRange, from: event.target.value } }))}
          />
        </label>

        <label className="text-xs text-muted">
          To
          <input
            type="date"
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={toInputDate(draft.dateRange.to)}
            onChange={(event) => setDraft((prev) => ({ ...prev, dateRange: { ...prev.dateRange, to: event.target.value } }))}
          />
        </label>

        <label className="text-xs text-muted">
          Aggregation
          <select
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={draft.aggregationMode}
            onChange={(event) => setDraft((prev) => ({ ...prev, aggregationMode: event.target.value as DashboardFilterState["aggregationMode"] }))}
          >
            {config.aggregationModes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          Compare
          <select
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={draft.compareMode}
            onChange={(event) => setDraft((prev) => ({ ...prev, compareMode: event.target.value as DashboardFilterState["compareMode"] }))}
          >
            {config.compareModes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded border border-line bg-navy px-3 py-1 text-sm font-semibold text-white"
          onClick={() => setFilters(draft)}
        >
          Apply
        </button>
        <button
          type="button"
          className="rounded border border-line bg-surface2 px-3 py-1 text-sm font-semibold text-ink"
          onClick={() => resetFilters()}
        >
          Reset
        </button>
        {loading ? <span className="text-xs text-muted">Loading filter config...</span> : null}
        {error ? <span className="text-xs text-negative">Config error: {error}</span> : null}
        {!error && warnings.length ? <span className="text-xs text-warning">Warnings: {warnings.join(", ")}</span> : null}
      </div>
    </section>
  );
}
