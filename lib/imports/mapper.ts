import type { AnalyticsFact } from "@/lib/analytics/model";
import type {
  ImportMappingProfile,
  ImportSourceType,
  ImportTargetField,
  NormalizedImportRow,
  RawImportRow,
} from "@/lib/imports/types";

function readMappedValue(row: RawImportRow, mappingProfile: ImportMappingProfile, targetField: ImportTargetField): unknown {
  const field = mappingProfile.fields.find((candidate) => candidate.targetField === targetField);
  if (!field) return undefined;
  return row.values[field.sourceColumn];
}

function cleanString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function optionalString(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned ? cleaned : null;
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000).toISOString();
  }

  const cleaned = cleanString(value);
  if (!cleaned) return "";

  const parsed = new Date(cleaned);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : cleaned;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const cleaned = cleanString(value).replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return Number.NaN;
  return Number(cleaned);
}

export function mapRawRowsToNormalizedRows(
  rawRows: RawImportRow[],
  mappingProfile: ImportMappingProfile,
  sourceType: ImportSourceType,
): NormalizedImportRow[] {
  return rawRows
    .map((row) => {
      const value = normalizeNumber(readMappedValue(row, mappingProfile, "value"));

      return {
        rowNumber: row.rowNumber,
        date: normalizeDate(readMappedValue(row, mappingProfile, "date")),
        country: cleanString(readMappedValue(row, mappingProfile, "country")),
        region: optionalString(readMappedValue(row, mappingProfile, "region")),
        unitId: optionalString(readMappedValue(row, mappingProfile, "unitId")),
        unitName: optionalString(readMappedValue(row, mappingProfile, "unitName")),
        unitExternalId: optionalString(readMappedValue(row, mappingProfile, "unitExternalId")),
        metricKey: cleanString(readMappedValue(row, mappingProfile, "metricKey")),
        article: optionalString(readMappedValue(row, mappingProfile, "article")),
        valueType: cleanString(readMappedValue(row, mappingProfile, "valueType")) as NormalizedImportRow["valueType"],
        value,
        currency: optionalString(readMappedValue(row, mappingProfile, "currency")),
        sourceType,
        raw: row.values,
      };
    });
}

export function mapNormalizedRowsToAnalyticsFacts(
  rows: NormalizedImportRow[],
  importBatchId?: string,
): AnalyticsFact[] {
  return rows
    .filter((row) => Number.isFinite(row.value))
    .map((row) => ({
      date: row.date,
      country: row.country,
      region: row.region,
      unitId: row.unitId,
      metricKey: row.metricKey,
      article: row.article,
      valueType: row.valueType,
      value: row.value,
      currency: row.currency,
      sourceType: row.sourceType,
      importBatchId,
    }));
}

export function mapImportRowsToAnalyticsFacts(
  rows: RawImportRow[],
  mappingProfile: ImportMappingProfile,
  importBatchId?: string,
): AnalyticsFact[] {
  const normalizedRows = mapRawRowsToNormalizedRows(rows, mappingProfile, mappingProfile.sourceType);
  return mapNormalizedRowsToAnalyticsFacts(normalizedRows, importBatchId);
}
