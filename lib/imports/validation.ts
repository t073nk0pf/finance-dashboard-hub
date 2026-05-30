import type { ImportPreview, ImportRowError, RawImportRow } from "@/lib/imports/types";
import type { SourceType } from "@/lib/analytics/model";

export type ImportValidationResult = {
  validRows: RawImportRow[];
  errors: ImportRowError[];
};

export function validateImportRows(rows: RawImportRow[]): ImportValidationResult {
  return {
    validRows: rows,
    errors: [],
  };
}

export function createImportPreview(sourceType: SourceType, rows: RawImportRow[]): ImportPreview {
  const validation = validateImportRows(rows);

  return {
    sourceType,
    rowsTotal: rows.length,
    rows: validation.validRows,
    errors: validation.errors,
  };
}
