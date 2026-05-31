import type { DashboardFilterPreset, DashboardFilterState } from "@/lib/dashboard/filters/types";
import { searchParamsToFilters } from "@/lib/dashboard/filters/urlState";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthRange(date: Date): { from: string; to: string } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 0));
  return { from: toDateOnly(from), to: toDateOnly(to) };
}

function previousMonthRange(date: Date): { from: string; to: string } {
  const currentMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const previousMonthStart = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1));
  const previousMonthEnd = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth(), 0));
  return { from: toDateOnly(previousMonthStart), to: toDateOnly(previousMonthEnd) };
}

function yearToDateRange(date: Date): { from: string; to: string } {
  return { from: `${date.getUTCFullYear()}-01-01`, to: toDateOnly(date) };
}

function withCountry(country: DashboardFilterState["country"], patch: Partial<DashboardFilterState>): Partial<DashboardFilterState> {
  return { ...patch, country };
}

export function getDashboardFilterPresets(today = new Date()): DashboardFilterPreset[] {
  const current = monthRange(today);
  const previous = previousMonthRange(today);
  const ytd = yearToDateRange(today);

  return [
    { id: "currentMonth", label: "Текущий месяц", filters: { dateRange: current, aggregationMode: "period" } },
    { id: "previousMonth", label: "Прошлый месяц", filters: { dateRange: previous, aggregationMode: "period" } },
    { id: "yearToDate", label: "С начала года", filters: { dateRange: ytd, aggregationMode: "cumulative" } },
    { id: "armeniaCurrentMonth", label: "Армения: текущий месяц", filters: withCountry("armenia", { dateRange: current, aggregationMode: "period" }) },
    { id: "russiaCurrentMonth", label: "Россия: текущий месяц", filters: withCountry("russia", { dateRange: current, aggregationMode: "period" }) },
    {
      id: "forecastCurrentMonth",
      label: "Forecast: текущий месяц",
      filters: { dateRange: current, asOfDate: toDateOnly(today), scenarios: ["pessimistic", "base", "optimistic"], method: "current_pace" },
    },
    { id: "planFactCurrentMonth", label: "Plan-Fact: текущий месяц", filters: { dateRange: current, compareMode: "plan", groupBy: "metric" } },
  ];
}

export function getPresetById(id: string, today = new Date()): DashboardFilterPreset | undefined {
  return getDashboardFilterPresets(today).find((preset) => preset.id === id);
}

export function applyPreset(baseFilters: DashboardFilterState, presetId: string, today = new Date()): DashboardFilterState {
  const preset = getPresetById(presetId, today);
  if (!preset) return baseFilters;
  const params = new URLSearchParams();
  const next = { ...baseFilters, ...preset.filters };
  Object.entries(next).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === "string") params.set(key, value);
  });
  return {
    ...searchParamsToFilters(params, today),
    ...next,
  };
}
