import type { AnalyticsFact } from "@/lib/analytics/model";
import { NotImplementedError } from "@/lib/analytics/model";
import type { ImportMappingProfile, NormalizedImportRow, RawImportRow } from "@/lib/imports/types";

export function normalizeImportRows(
  rows: RawImportRow[],
  mappingProfile: ImportMappingProfile,
): NormalizedImportRow[] {
  void rows;
  void mappingProfile;
  throw new NotImplementedError("Import row normalization is not implemented yet");
}

export function mapImportRowsToAnalyticsFacts(
  rows: RawImportRow[],
  mappingProfile: ImportMappingProfile,
): AnalyticsFact[] {
  const normalizedRows = normalizeImportRows(rows, mappingProfile);

  return normalizedRows.map((row) => ({
    date: row.date,
    country: row.country,
    region: row.region,
    metricKey: row.metricKey,
    article: row.article,
    valueType: row.valueType,
    value: row.value,
    currency: row.currency,
    sourceType: row.sourceType,
  }));
}
