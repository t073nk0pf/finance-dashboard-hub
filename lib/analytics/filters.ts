import type { DateRange, Scope, ValueType } from "@/lib/analytics/model";

export type AggregationMode = "period" | "cumulative" | "daily" | "weekly" | "monthly";
export type CompareMode = "plan" | "previous_period" | "previous_month" | "previous_year" | "custom_period" | "none";

export type DashboardFilters = Scope & {
  dateRange: DateRange;
  aggregationMode: AggregationMode;
  compareMode: CompareMode;
  valueTypes: ValueType[];
};

export const defaultDashboardFilters: DashboardFilters = {
  country: "all",
  region: "all",
  unitId: null,
  dateRange: {
    from: "2026-01-01",
    to: "2026-04-30",
  },
  aggregationMode: "cumulative",
  compareMode: "plan",
  valueTypes: ["fact", "plan", "forecast"],
};

export function normalizeDashboardFilters(filters: Partial<DashboardFilters> = {}): DashboardFilters {
  return {
    ...defaultDashboardFilters,
    ...filters,
    dateRange: {
      ...defaultDashboardFilters.dateRange,
      ...filters.dateRange,
    },
    valueTypes: filters.valueTypes?.length ? filters.valueTypes : defaultDashboardFilters.valueTypes,
  };
}
