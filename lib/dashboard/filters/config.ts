import type { ForecastMethod, ForecastScenario } from "@/lib/forecast/types";
import type { PlanFactGroupBy } from "@/lib/analytics/types";
import type { AggregationMode, CompareMode } from "@/lib/analytics/filters";
import type { DashboardCountry, DashboardFilterConfig, DashboardFilterOption } from "@/lib/dashboard/filters/types";
import type { ValueType } from "@/lib/analytics/model";

const COUNTRIES: DashboardFilterOption[] = [
  { value: "all", label: "Все страны" },
  { value: "armenia", label: "Армения" },
  { value: "russia", label: "Россия" },
];

const AGGREGATION_MODES: AggregationMode[] = ["period", "cumulative", "daily", "weekly", "monthly"];
const COMPARE_MODES: CompareMode[] = ["plan", "previous_period", "previous_month", "previous_year", "custom_period", "none"];
const GROUP_BY_OPTIONS: PlanFactGroupBy[] = ["total", "country", "region", "unit", "article", "metric", "month", "week", "day"];
const VALUE_TYPE_OPTIONS: ValueType[] = ["fact", "plan", "forecast", "business_plan"];
const SCENARIO_OPTIONS: ForecastScenario[] = ["pessimistic", "base", "optimistic"];
const METHOD_OPTIONS: ForecastMethod[] = ["current_pace", "plan_distribution", "previous_period", "manual"];

function toOption(value: string): DashboardFilterOption {
  return {
    value,
    label: value,
  };
}

export function getCountryOptions(): DashboardFilterOption[] {
  return COUNTRIES;
}

export function getAggregationModeOptions(): DashboardFilterOption[] {
  return AGGREGATION_MODES.map(toOption);
}

export function getCompareModeOptions(): DashboardFilterOption[] {
  return COMPARE_MODES.map(toOption);
}

export function getGroupByOptions(): DashboardFilterOption[] {
  return GROUP_BY_OPTIONS.map(toOption);
}

export function getValueTypeOptions(): DashboardFilterOption[] {
  return VALUE_TYPE_OPTIONS.map(toOption);
}

export function getScenarioOptions(): DashboardFilterOption[] {
  return SCENARIO_OPTIONS.map(toOption);
}

export function getMethodOptions(): DashboardFilterOption[] {
  return METHOD_OPTIONS.map(toOption);
}

export function getDashboardFilterConfig(scope: { country?: DashboardCountry } = {}): DashboardFilterConfig {
  const regions: DashboardFilterOption[] = [{ value: "all", label: "Все регионы" }];
  const units: DashboardFilterOption[] = [{ value: "all", label: "Все рестораны" }];

  if (scope.country === "armenia") {
    regions.push({ value: "yerevan", label: "Yerevan" }, { value: "gyumri", label: "Gyumri" });
  }

  if (scope.country === "russia") {
    regions.push({ value: "spb", label: "Saint Petersburg" }, { value: "lenoblast", label: "Leningrad Oblast" });
  }

  return {
    countries: getCountryOptions(),
    regions,
    units,
    aggregationModes: getAggregationModeOptions(),
    compareModes: getCompareModeOptions(),
    groupByOptions: getGroupByOptions(),
    valueTypeOptions: getValueTypeOptions(),
    scenarioOptions: getScenarioOptions(),
    methodOptions: getMethodOptions(),
  };
}
