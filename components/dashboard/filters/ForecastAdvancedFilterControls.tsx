"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import type { DashboardFilterConfig, DashboardFilterState } from "@/lib/dashboard/filters/types";

type FilterConfigResponse = {
  config: DashboardFilterConfig;
};

const DEFAULT_CONFIG: DashboardFilterConfig = {
  countries: [],
  regions: [],
  units: [],
  aggregationModes: [],
  compareModes: [],
  groupByOptions: [],
  valueTypeOptions: [],
  scenarioOptions: [
    { value: "pessimistic", label: "pessimistic" },
    { value: "base", label: "base" },
    { value: "optimistic", label: "optimistic" },
  ],
  methodOptions: [
    { value: "current_pace", label: "current_pace" },
    { value: "plan_distribution", label: "plan_distribution" },
    { value: "previous_period", label: "previous_period" },
    { value: "manual", label: "manual" },
  ],
};

type AdvancedDraft = {
  asOfDate: string;
  scenarios: DashboardFilterState["scenarios"];
  method: DashboardFilterState["method"];
};

function toInputDate(value?: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function isValidDateOnly(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time);
}

export function ForecastAdvancedFilterControls() {
  const { filters, setFilters } = useDashboardFilters();
  const [config, setConfig] = useState<DashboardFilterConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdvancedDraft>({
    asOfDate: toInputDate(filters.asOfDate),
    scenarios: filters.scenarios,
    method: filters.method,
  });

  useEffect(() => {
    setDraft({
      asOfDate: toInputDate(filters.asOfDate),
      scenarios: filters.scenarios,
      method: filters.method,
    });
  }, [filters.asOfDate, filters.method, filters.scenarios]);

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
        setConfig(payload.config ?? DEFAULT_CONFIG);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load filter config");
        setConfig(DEFAULT_CONFIG);
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

  const asOfDateValid = useMemo(() => isValidDateOnly(draft.asOfDate), [draft.asOfDate]);
  const asOfDateError = asOfDateValid ? null : "Неверный формат as of date.";

  const applyDisabled = !!asOfDateError;

  const scenarioOptions = config.scenarioOptions.length ? config.scenarioOptions : DEFAULT_CONFIG.scenarioOptions;
  const methodOptions = config.methodOptions.length ? config.methodOptions : DEFAULT_CONFIG.methodOptions;

  return (
    <section className="rounded-lg border border-line bg-surface p-3 shadow-soft">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.06em] text-muted">Forecast options (pilot)</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-muted">
          As of date
          <input
            type="date"
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={toInputDate(draft.asOfDate)}
            onChange={(event) => setDraft((prev) => ({ ...prev, asOfDate: event.target.value }))}
          />
        </label>

        <label className="text-xs text-muted">
          Scenarios
          <select
            multiple
            className="mt-1 h-[84px] w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={draft.scenarios}
            onChange={(event) => {
              const next = Array.from(event.target.selectedOptions).map((option) => option.value) as DashboardFilterState["scenarios"];
              setDraft((prev) => ({ ...prev, scenarios: next.length ? next : ["base"] }));
            }}
          >
            {scenarioOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          Method
          <select
            className="mt-1 w-full rounded border border-line bg-surface2 px-2 py-1 text-sm text-ink"
            value={draft.method}
            onChange={(event) => setDraft((prev) => ({ ...prev, method: event.target.value as DashboardFilterState["method"] }))}
          >
            {methodOptions.map((option) => (
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
          className="rounded border border-line bg-navy px-3 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() =>
            setFilters({
              asOfDate: draft.asOfDate || undefined,
              scenarios: draft.scenarios,
              method: draft.method,
            })
          }
          disabled={applyDisabled}
        >
          Apply
        </button>
        <button
          type="button"
          className="rounded border border-line bg-surface2 px-3 py-1 text-sm font-semibold text-ink"
          onClick={() =>
            setFilters({
              asOfDate: undefined,
              scenarios: ["pessimistic", "base", "optimistic"],
              method: "current_pace",
            })
          }
        >
          Reset forecast options
        </button>
        {loading ? <span className="text-xs text-muted">Loading forecast options...</span> : null}
        {error ? <span className="text-xs text-negative">Config error: {error}</span> : null}
        {!error && asOfDateError ? <span className="text-xs text-warning">{asOfDateError}</span> : null}
      </div>
    </section>
  );
}
