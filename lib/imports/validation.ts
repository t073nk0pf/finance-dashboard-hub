import type { ImportMappingProfile, ImportPreview, ImportValidationResult, RawImportRow } from "@/lib/imports/types";
import type { SourceType } from "@/lib/analytics/model";

export function validateImportRows(rows: RawImportRow[], mappingProfile?: ImportMappingProfile): ImportValidationResult {
  void mappingProfile;

  return {
    validRows: rows,
    errors: [],
  };
}

export function createImportPreview(
  sourceType: SourceType,
  rows: RawImportRow[],
  mappingProfile?: ImportMappingProfile,
): ImportPreview {
  const validation = validateImportRows(rows, mappingProfile);

  return {
    sourceType,
    rowsTotal: rows.length,
    rows: validation.validRows,
    errors: validation.errors,
  };
}
