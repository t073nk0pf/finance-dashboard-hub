import type { AggregationMode, CompareMode } from "@/lib/analytics/filters";
import type { ValueType } from "@/lib/analytics/model";
import type { ForecastMethod, ForecastScenario } from "@/lib/forecast/types";
import type { PlanFactGroupBy } from "@/lib/analytics/types";

export type DashboardCountry = "all" | "armenia" | "russia";

export type DateRange = {
  from: string;
  to: string;
};

export type DashboardFilterState = {
  country: DashboardCountry;
  region: string;
  unitId?: string;
  dateRange: DateRange;
  aggregationMode: AggregationMode;
  compareMode: CompareMode;
  groupBy: PlanFactGroupBy;
  metrics: string[];
  articles: string[];
  valueTypes: ValueType[];
  asOfDate?: string;
  scenarios: ForecastScenario[];
  method: ForecastMethod;
};

export type DashboardFilterOption = {
  value: string;
  label: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
};

export type DashboardFilterConfig = {
  countries: DashboardFilterOption[];
  regions: DashboardFilterOption[];
  units: DashboardFilterOption[];
  aggregationModes: DashboardFilterOption[];
  compareModes: DashboardFilterOption[];
  groupByOptions: DashboardFilterOption[];
  valueTypeOptions: DashboardFilterOption[];
  scenarioOptions: DashboardFilterOption[];
  methodOptions: DashboardFilterOption[];
};

export type DashboardFilterPreset = {
  id: string;
  label: string;
  filters: Partial<DashboardFilterState>;
};
