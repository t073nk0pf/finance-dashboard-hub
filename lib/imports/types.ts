import type { AnalyticsFact, SourceType } from "@/lib/analytics/model";

export type ImportStatus = "pending" | "running" | "completed" | "failed" | "completed_with_errors";

export type RawImportRow = {
  rowNumber: number;
  values: Record<string, unknown>;
};

export type ImportPreviewRow = RawImportRow & {
  normalized?: NormalizedImportRow;
};

export type ImportRowError = {
  rowNumber: number;
  field?: string;
  code: string;
  message: string;
  rawJson?: Record<string, unknown>;
};

export type ImportMappingProfile = {
  sourceType: Extract<SourceType, "excel" | "google_sheets" | "manual">;
  dateColumn: string;
  countryColumn: string;
  regionColumn?: string;
  unitColumn?: string;
  metricColumn: string;
  valueTypeColumn: string;
  valueColumn: string;
  currencyColumn?: string;
};

export type NormalizedImportRow = {
  rowNumber: number;
  date: string;
  country: string;
  region?: string | null;
  unitExternalId?: string | null;
  metricKey: string;
  article?: string | null;
  valueType: AnalyticsFact["valueType"];
  value: number;
  currency?: string | null;
  sourceType: ImportMappingProfile["sourceType"];
};

export type ImportValidationResult = {
  validRows: ImportPreviewRow[];
  errors: ImportRowError[];
};

export type ImportPreview = {
  sourceType: SourceType;
  rowsTotal: number;
  rows: ImportPreviewRow[];
  errors: ImportRowError[];
};

export type ImportCommitInput = {
  sourceId?: string;
  sourceType: SourceType;
  rows: RawImportRow[];
  createdById?: string;
  meta?: Record<string, unknown>;
};

export type ImportCommitResult = {
  batchId: string;
  status: ImportStatus;
  rowsTotal: number;
  rowsImported: number;
  rowsFailed: number;
  facts: AnalyticsFact[];
  errors: ImportRowError[];
};
