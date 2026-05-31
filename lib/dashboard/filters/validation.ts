import type { DashboardFilterState } from "@/lib/dashboard/filters/types";

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

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
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
