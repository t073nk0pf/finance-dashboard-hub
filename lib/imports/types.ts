import type { AnalyticsFact, AnalyticsValueType } from "@/lib/analytics/model";

export type ImportSourceType = "excel" | "csv" | "google_sheets" | "manual" | "dodo_api";
export type ImportValidationSeverity = "error" | "warning";
export type ImportStatus = "pending" | "running" | "completed" | "failed" | "completed_with_errors";

export const importSourceTypes: ImportSourceType[] = ["excel", "csv", "google_sheets", "manual", "dodo_api"];
export const analyticsValueTypes: AnalyticsValueType[] = ["fact", "plan", "forecast", "business_plan"];

export type RawImportRow = {
  rowNumber: number;
  values: Record<string, unknown>;
};

export type ImportColumn = {
  key: string;
  label: string;
  index?: number;
  sampleValues: unknown[];
};

export type ImportMappingField = {
  targetField: ImportTargetField;
  sourceColumn: string;
  required: boolean;
  transform?: string;
};

export type ImportTargetField =
  | "date"
  | "country"
  | "region"
  | "unitName"
  | "unitExternalId"
  | "metricKey"
  | "article"
  | "valueType"
  | "value"
  | "currency";

export type ImportMappingProfile = {
  id?: string;
  name: string;
  sourceType: ImportSourceType;
  fields: ImportMappingField[];
};

export type NormalizedImportRow = {
  rowNumber: number;
  date: string;
  country: string;
  region?: string | null;
  unitName?: string | null;
  unitExternalId?: string | null;
  metricKey: string;
  article?: string | null;
  valueType: AnalyticsValueType;
  value: number;
  currency?: string | null;
  sourceType: ImportSourceType;
  raw: Record<string, unknown>;
};

export type ImportPreviewRow = RawImportRow & {
  normalized?: NormalizedImportRow;
};

export type ImportValidationError = {
  rowNumber: number;
  field?: string;
  message: string;
  severity: ImportValidationSeverity;
};

export type ImportRowError = ImportValidationError & {
  code?: string;
  rawJson?: Record<string, unknown>;
};

export type ImportValidationOptions = {
  strictMetricDefinitions?: boolean;
  allowUnknownUnits?: boolean;
  allowUnknownMetrics?: boolean;
  knownMetricKeys?: string[];
};

export type ImportValidationResult = {
  isValid: boolean;
  rowsTotal: number;
  rowsValid: number;
  rowsInvalid: number;
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
};

export type ImportPreviewRequest = {
  sourceType: ImportSourceType;
  fileName?: string;
  sheetName?: string;
  range?: string;
  rawRows?: RawImportRow[];
  mappingProfileId?: string;
};

export type ImportPreviewResult = {
  columns: ImportColumn[];
  rowsPreview: RawImportRow[];
  rowsTotal: number;
  detectedSourceType: ImportSourceType;
  warnings: ImportValidationError[];
  suggestedMapping?: ImportMappingProfile;
};

export type ConfirmImportRequest = {
  sourceType: ImportSourceType;
  sourceId?: string;
  mappingProfile: ImportMappingProfile;
  rows: RawImportRow[];
  meta?: Record<string, unknown>;
};

export type ConfirmImportResult = {
  importBatchId: string;
  rowsTotal: number;
  rowsImported: number;
  rowsFailed: number;
  status: ImportStatus;
  validation: ImportValidationResult;
};

export type ImportPreview = ImportPreviewResult;

export type ImportCommitInput = ConfirmImportRequest & {
  createdById?: string;
};

export type ImportCommitResult = ConfirmImportResult & {
  facts?: AnalyticsFact[];
};
