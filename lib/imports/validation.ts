import {
  analyticsValueTypes,
  importSourceTypes,
  type ImportValidationError,
  type ImportValidationOptions,
  type ImportValidationResult,
  type NormalizedImportRow,
} from "@/lib/imports/types";

function isEmptyRow(row: NormalizedImportRow): boolean {
  return Object.values(row.raw).every((value) => value === null || value === undefined || String(value).trim() === "");
}

export function validateImportRows(
  rows: NormalizedImportRow[],
  options: ImportValidationOptions = {},
): ImportValidationResult {
  const errors: ImportValidationError[] = [];
  const warnings: ImportValidationError[] = [];
  let emptyRows = 0;

  const knownMetricKeys = new Set(options.knownMetricKeys ?? []);

  for (const row of rows) {
    if (isEmptyRow(row)) {
      emptyRows += 1;
      warnings.push({
        rowNumber: row.rowNumber,
        message: "Empty row ignored",
        severity: "warning",
      });
      continue;
    }

    if (!row.date) {
      errors.push({ rowNumber: row.rowNumber, field: "date", message: "Date is required", severity: "error" });
    } else if (!Number.isFinite(new Date(row.date).getTime())) {
      errors.push({ rowNumber: row.rowNumber, field: "date", message: "Date is invalid", severity: "error" });
    }

    if (!row.country) {
      errors.push({ rowNumber: row.rowNumber, field: "country", message: "Country is required", severity: "error" });
    }

    if (!row.metricKey) {
      errors.push({ rowNumber: row.rowNumber, field: "metricKey", message: "Metric key is required", severity: "error" });
    }

    if (!row.valueType || !analyticsValueTypes.includes(row.valueType)) {
      errors.push({ rowNumber: row.rowNumber, field: "valueType", message: "Invalid value type", severity: "error" });
    }

    if (!Number.isFinite(row.value)) {
      errors.push({ rowNumber: row.rowNumber, field: "value", message: "Value must be a number", severity: "error" });
    }

    if (!importSourceTypes.includes(row.sourceType)) {
      errors.push({ rowNumber: row.rowNumber, field: "sourceType", message: "Invalid source type", severity: "error" });
    }

    if (row.metricKey && knownMetricKeys.size > 0 && !knownMetricKeys.has(row.metricKey)) {
      const issue: ImportValidationError = {
        rowNumber: row.rowNumber,
        field: "metricKey",
        message: `Unknown metric key: ${row.metricKey}`,
        severity: options.strictMetricDefinitions || options.allowUnknownMetrics === false ? "error" : "warning",
      };

      if (issue.severity === "error") errors.push(issue);
      else warnings.push(issue);
    }
  }

  const invalidRowNumbers = new Set(errors.map((error) => error.rowNumber));
  const rowsInvalid = invalidRowNumbers.size;
  const rowsValid = Math.max(rows.length - rowsInvalid - emptyRows, 0);

  return {
    isValid: errors.length === 0,
    rowsTotal: rows.length,
    rowsValid,
    rowsInvalid,
    errors,
    warnings,
  };
}
