import type { AnalyticsFact, SourceType } from "@/lib/analytics/model";

export type ImportStatus = "pending" | "running" | "completed" | "failed";

export type RawImportRow = {
  rowNumber: number;
  values: Record<string, unknown>;
};

export type ImportRowError = {
  rowNumber?: number;
  field?: string;
  code: string;
  message: string;
  rawRow?: Record<string, unknown>;
};

export type ImportPreview = {
  sourceType: SourceType;
  rowsTotal: number;
  rows: RawImportRow[];
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
