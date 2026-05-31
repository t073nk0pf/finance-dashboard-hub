import { AnalyticsValueType, ImportStatus, MetricDirection, MetricFormat, MetricKind, SourceType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { mapNormalizedRowsToAnalyticsFacts, mapRawRowsToNormalizedRows } from "@/lib/imports/mapper";
import {
  importSourceTypes,
  type ConfirmImportRequest,
  type ConfirmImportResult,
  type ImportColumn,
  type ImportMappingField,
  type ImportMappingProfile,
  type ImportPreviewRequest,
  type ImportPreviewResult,
  type ImportSourceType,
  type ImportValidationError,
  type NormalizedImportRow,
} from "@/lib/imports/types";
import { validateImportRows } from "@/lib/imports/validation";

type ImportBatchCreateData = {
  sourceId?: string;
  sourceType: ImportSourceType;
  source?: string;
  fileName?: string;
  rowsTotal?: number;
  createdById?: string;
  meta?: Record<string, unknown>;
};

type ImportBatchListFilters = {
  take?: number;
  sourceType?: ImportSourceType;
};

const targetFields: ImportMappingField["targetField"][] = [
  "date",
  "country",
  "region",
  "unitName",
  "unitExternalId",
  "metricKey",
  "article",
  "valueType",
  "value",
  "currency",
];

const requiredFields = new Set<ImportMappingField["targetField"]>(["date", "country", "metricKey", "valueType", "value"]);

function toPrismaSourceType(sourceType: ImportSourceType): SourceType {
  const map: Record<ImportSourceType, SourceType> = {
    manual: SourceType.MANUAL,
    excel: SourceType.EXCEL,
    csv: SourceType.CSV,
    google_sheets: SourceType.GOOGLE_SHEETS,
    dodo_api: SourceType.DODO_API,
  };
  return map[sourceType];
}

function toPrismaValueType(valueType: NormalizedImportRow["valueType"]): AnalyticsValueType {
  const map: Record<NormalizedImportRow["valueType"], AnalyticsValueType> = {
    fact: AnalyticsValueType.FACT,
    plan: AnalyticsValueType.PLAN,
    forecast: AnalyticsValueType.FORECAST,
    business_plan: AnalyticsValueType.BUSINESS_PLAN,
  };
  return map[valueType];
}

function toImportStatus(status: ImportStatus): ConfirmImportResult["status"] {
  return status.toLowerCase() as ConfirmImportResult["status"];
}

function columnMatchesTarget(columnKey: string, targetField: ImportMappingField["targetField"]): boolean {
  const normalized = columnKey.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return normalized === targetField.toLowerCase();
}

function buildColumns(rows: ImportPreviewRequest["rawRows"] = []): ImportColumn[] {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row.values))));
  return keys.map((key, index) => ({
    key,
    label: key,
    index,
    sampleValues: rows.slice(0, 5).map((row) => row.values[key]).filter((value) => value !== undefined),
  }));
}

function suggestMapping(sourceType: ImportSourceType, columns: ImportColumn[]): ImportMappingProfile | undefined {
  const fields = targetFields
    .map((targetField) => {
      const sourceColumn = columns.find((column) => columnMatchesTarget(column.key, targetField))?.key;
      if (!sourceColumn) return null;
      return {
        targetField,
        sourceColumn,
        required: requiredFields.has(targetField),
      };
    })
    .filter((field): field is ImportMappingField => field !== null);

  if (fields.length === 0) return undefined;

  return {
    name: "Auto-detected mapping",
    sourceType,
    fields,
  };
}

function validationErrorsForRows(rows: NormalizedImportRow[], validationErrors: ImportValidationError[]): NormalizedImportRow[] {
  const invalidRowNumbers = new Set(validationErrors.map((error) => error.rowNumber));
  return rows.filter((row) => !invalidRowNumbers.has(row.rowNumber));
}

export async function createImportPreview(input: ImportPreviewRequest): Promise<ImportPreviewResult> {
  const sourceType = importSourceTypes.includes(input.sourceType) ? input.sourceType : "manual";
  const rawRows = input.rawRows ?? [];
  const columns = buildColumns(rawRows);

  return {
    columns,
    rowsPreview: rawRows.slice(0, 25),
    rowsTotal: rawRows.length,
    detectedSourceType: sourceType,
    warnings: [],
    suggestedMapping: suggestMapping(sourceType, columns),
  };
}

export async function createImportBatch(data: ImportBatchCreateData) {
  return db.importBatch.create({
    data: {
      sourceId: data.sourceId,
      sourceType: toPrismaSourceType(data.sourceType),
      source: data.source ?? data.sourceType,
      sourceFileName: data.fileName,
      status: ImportStatus.RUNNING,
      rowsTotal: data.rowsTotal ?? 0,
      rowsImported: 0,
      rowsFailed: 0,
      importedById: data.createdById,
      metaJson: data.meta as Prisma.InputJsonValue,
    },
  });
}

async function ensureMetricDefinitions(rows: NormalizedImportRow[]) {
  const metricKeys = Array.from(new Set(rows.map((row) => row.metricKey).filter(Boolean)));

  await Promise.all(
    metricKeys.map((metricKey) =>
      db.metricArticle.upsert({
        where: { code: metricKey },
        update: {},
        create: {
          code: metricKey,
          name: metricKey,
          category: "imported",
          article: metricKey,
          unitType: "number",
          direction: MetricDirection.NEUTRAL,
          format: MetricFormat.NUMBER,
          kind: MetricKind.NEUTRAL,
        },
      }),
    ),
  );
}

export async function saveAnalyticsFacts(facts: ReturnType<typeof mapNormalizedRowsToAnalyticsFacts>): Promise<number> {
  if (facts.length === 0) return 0;

  const created = await db.analyticsFact.createMany({
    data: facts.map((fact) => ({
      date: new Date(fact.date),
      country: fact.country,
      region: fact.region,
      metricKey: fact.metricKey,
      article: fact.article,
      valueType: toPrismaValueType(fact.valueType),
      value: fact.value,
      currency: fact.currency,
      sourceType: toPrismaSourceType(fact.sourceType as ImportSourceType),
      sourceId: fact.sourceId,
      importBatchId: fact.importBatchId,
    })),
  });

  return created.count;
}

export async function saveImportRowErrors(importBatchId: string, errors: ImportValidationError[]): Promise<number> {
  if (errors.length === 0) return 0;

  const created = await db.importRowError.createMany({
    data: errors.map((error) => ({
      importBatchId,
      rowNumber: error.rowNumber,
      field: error.field,
      code: error.severity.toUpperCase(),
      message: error.message,
    })),
  });

  return created.count;
}

export async function confirmImport(input: ConfirmImportRequest, userId?: string): Promise<ConfirmImportResult> {
  const normalizedRows = mapRawRowsToNormalizedRows(input.rows, input.mappingProfile, input.sourceType);
  const validation = validateImportRows(normalizedRows, {
    allowUnknownMetrics: true,
    allowUnknownUnits: true,
  });

  const importBatch = await createImportBatch({
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    rowsTotal: input.rows.length,
    createdById: userId,
    meta: input.meta,
  });

  const rowsToImport = validationErrorsForRows(normalizedRows, validation.errors);
  await ensureMetricDefinitions(rowsToImport);

  const facts = mapNormalizedRowsToAnalyticsFacts(rowsToImport, importBatch.id);
  const rowsImported = await saveAnalyticsFacts(facts);
  const rowsFailed = validation.errors.length;
  const status =
    rowsFailed > 0 && rowsImported > 0
      ? ImportStatus.COMPLETED_WITH_ERRORS
      : rowsFailed > 0
        ? ImportStatus.FAILED
        : ImportStatus.COMPLETED;

  await saveImportRowErrors(importBatch.id, validation.errors);

  await db.importBatch.update({
    where: { id: importBatch.id },
    data: {
      status,
      rowsImported,
      rowsFailed,
      finishedAt: new Date(),
    },
  });

  return {
    importBatchId: importBatch.id,
    rowsTotal: input.rows.length,
    rowsImported,
    rowsFailed,
    status: toImportStatus(status),
    validation,
  };
}

export async function getImportBatch(importBatchId: string) {
  return db.importBatch.findUnique({
    where: { id: importBatchId },
    include: {
      rowErrors: true,
    },
  });
}

export async function listImportBatches(filters: ImportBatchListFilters = {}) {
  return db.importBatch.findMany({
    where: filters.sourceType
      ? {
          sourceType: toPrismaSourceType(filters.sourceType),
        }
      : undefined,
    orderBy: { startedAt: "desc" },
    take: filters.take ?? 50,
    include: {
      rowErrors: true,
    },
  });
}
