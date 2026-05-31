import type { DashboardFilterState } from "@/lib/dashboard/filters/types";
import type { ForecastMethod, ForecastScenario } from "@/lib/forecast/types";

export type DashboardFilterValidationSeverity = "error" | "warning";

export type DashboardFilterValidationMessage = {
  field: string;
  message: string;
  severity: DashboardFilterValidationSeverity;
};

export type DashboardFilterValidationResult = {
  isValid: boolean;
  errors: DashboardFilterValidationMessage[];
  warnings: DashboardFilterValidationMessage[];
};

export type ForecastAdvancedValidationResult = {
  isValid: boolean;
  errors: DashboardFilterValidationMessage[];
  warnings: DashboardFilterValidationMessage[];
};

export type ForecastAdvancedNormalized = {
  asOfDate?: string;
  scenarios?: ForecastScenario[];
  method?: ForecastMethod;
};

const ALLOWED_SCENARIOS: ForecastScenario[] = ["pessimistic", "base", "optimistic"];
const ALLOWED_METHODS: ForecastMethod[] = ["current_pace", "plan_distribution", "previous_period", "manual"];

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return Number.isFinite(Date.parse(`${value}T00:00:00.000Z`));
}

function normalizeAsOfDate(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (!isDateOnly(raw)) return undefined;
  return raw;
}

export function normalizeForecastAdvancedFilters(filters: {
  asOfDate?: string;
  scenarios?: string[];
  method?: string;
}): ForecastAdvancedNormalized {
  const asOfDate = normalizeAsOfDate(filters.asOfDate);

  const scenarioInput = filters.scenarios ?? [];
  const dedupedOrdered = ALLOWED_SCENARIOS.filter((allowed) =>
    scenarioInput.some((item) => item?.trim() === allowed),
  );
  const scenarios = dedupedOrdered.length ? dedupedOrdered : undefined;

  const rawMethod = filters.method?.trim();
  const method = rawMethod && ALLOWED_METHODS.includes(rawMethod as ForecastMethod) ? (rawMethod as ForecastMethod) : undefined;

  return {
    asOfDate,
    scenarios,
    method,
  };
}

export function validateForecastAdvancedFilters(filters: {
  asOfDate?: string;
  scenarios?: string[];
  method?: string;
}): ForecastAdvancedValidationResult {
  const errors: DashboardFilterValidationMessage[] = [];
  const warnings: DashboardFilterValidationMessage[] = [];

  const rawAsOfDate = filters.asOfDate?.trim();
  if (rawAsOfDate && !normalizeAsOfDate(rawAsOfDate)) {
    errors.push({
      field: "asOfDate",
      message: "Некорректная as of date.",
      severity: "error",
    });
  }

  const rawScenarios = (filters.scenarios ?? []).map((item) => item.trim()).filter(Boolean);
  const invalidScenarios = rawScenarios.filter((item) => !ALLOWED_SCENARIOS.includes(item as ForecastScenario));
  if (invalidScenarios.length) {
    warnings.push({
      field: "scenarios",
      message: "Некоторые сценарии не поддерживаются и будут пропущены.",
      severity: "warning",
    });
  }

  const rawMethod = filters.method?.trim();
  if (rawMethod && !ALLOWED_METHODS.includes(rawMethod as ForecastMethod)) {
    errors.push({
      field: "method",
      message: "Некорректный метод прогноза.",
      severity: "error",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateDashboardFilters(filters: Partial<DashboardFilterState>): DashboardFilterValidationResult {
  const errors: DashboardFilterValidationMessage[] = [];
  const warnings: DashboardFilterValidationMessage[] = [];

  const fromRaw = filters.dateRange?.from?.trim();
  const toRaw = filters.dateRange?.to?.trim();
  const from = parseDate(filters.dateRange?.from);
  const to = parseDate(filters.dateRange?.to);

  if (fromRaw && !toRaw) {
    errors.push({
      field: "dateRange",
      message: "Укажите дату окончания периода.",
      severity: "error",
    });
  }

  if (toRaw && !fromRaw) {
    errors.push({
      field: "dateRange",
      message: "Укажите дату начала периода.",
      severity: "error",
    });
  }

  if (fromRaw && !from) {
    errors.push({
      field: "dateRange.from",
      message: "Некорректная дата начала.",
      severity: "error",
    });
  }

  if (toRaw && !to) {
    errors.push({
      field: "dateRange.to",
      message: "Некорректная дата окончания.",
      severity: "error",
    });
  }

  if (from && to && from > to) {
    errors.push({
      field: "dateRange",
      message: "Дата начала не может быть позже даты окончания.",
      severity: "error",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
