import type { AnalyticsFact, AnalyticsValueType } from "@/lib/analytics/model";

export type ImportSourceType = "excel" | "csv" | "google_sheets" | "manual" | "dodo_api" | "seed";
export type ImportValidationSeverity = "error" | "warning";
export type ImportStatus = "pending" | "running" | "completed" | "failed" | "completed_with_errors";

export const importSourceTypes: ImportSourceType[] = ["excel", "csv", "google_sheets", "manual", "dodo_api", "seed"];
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
  | "unitId"
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
  unitId?: string | null;
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
  knownUnitIds?: string[];
  knownUnitNames?: string[];
  knownUnitExternalIds?: string[];
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

export type ImportPreviewMapping = Partial<Record<
  | "date"
  | "country"
  | "region"
  | "unitId"
  | "unitName"
  | "externalUnitId"
  | "metricKey"
  | "article"
  | "valueType"
  | "value"
  | "currency",
  string
>>;

export type ImportPreviewOptionsInput = {
  strictMetrics?: boolean;
  strictUnits?: boolean;
};

export type ImportPreviewRowsInput = {
  sourceType: string;
  rows: Array<Record<string, unknown>>;
  mapping?: ImportPreviewMapping;
  options?: ImportPreviewOptionsInput;
};

export type ImportPreviewIssue = {
  rowIndex: number;
  field?: string;
  message: string;
  severity: ImportValidationSeverity;
};

export type ImportPreviewRowStatus = "valid" | "warning" | "invalid";

export type ImportPreviewRowNormalized = {
  date: string | null;
  unitId: string | null;
  unitName: string | null;
  externalUnitId: string | null;
  metricKey: string | null;
  value: number | null;
  valueType: string | null;
  sourceType: string;
};

export type ImportPreviewRowResult = {
  rowIndex: number;
  status: ImportPreviewRowStatus;
  normalized: ImportPreviewRowNormalized;
  raw: Record<string, unknown>;
  errors: ImportPreviewIssue[];
};

export type ImportPreviewSummary = {
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  errorsCount: number;
};

export type ImportPreviewRowsResult = {
  rowsPreview: ImportPreviewRowResult[];
  errors: ImportPreviewIssue[];
  summary: ImportPreviewSummary;
  meta: {
    generatedAt: string;
    source: "import_preview";
    persisted: false;
  };
};

export type PreparedImportRowsResult = {
  normalizedRows: NormalizedImportRow[];
  rowsPreview: ImportPreviewRowResult[];
  errors: ImportPreviewIssue[];
  summary: ImportPreviewSummary;
  sourceType: ImportSourceType;
};

export type ImportConfirmRowsInput = ImportPreviewRowsInput & {
  idempotencyKey?: string;
};

export type ImportConfirmBatch = {
  id: string;
  sourceType: ImportSourceType;
  status: ImportStatus;
  rowsTotal: number;
  rowsImported: number;
  rowsFailed: number;
  startedAt: string;
  finishedAt: string | null;
};

export type ImportConfirmMeta = {
  generatedAt: string;
  source: "import_confirm";
  persisted: boolean;
  rejected: boolean;
  duplicate?: boolean;
};

export type ImportConfirmRowsResult = {
  importBatch: ImportConfirmBatch | null;
  savedFacts: AnalyticsFact[];
  errors: ImportPreviewIssue[];
  summary: ImportPreviewSummary;
  meta: ImportConfirmMeta;
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
