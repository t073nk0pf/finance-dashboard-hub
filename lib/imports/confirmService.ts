import { AnalyticsValueType, ImportStatus, SourceType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { AnalyticsFact } from "@/lib/analytics/model";
import { db } from "@/lib/db";
import { IMPORT_PREVIEW_MAX_ROWS, ImportPreviewInputError, prepareImportRows } from "@/lib/imports/previewService";
import type {
  ImportConfirmBatch,
  ImportConfirmRowsInput,
  ImportConfirmRowsResult,
  ImportPreviewIssue,
  ImportSourceType,
} from "@/lib/imports/types";

export const IMPORT_CONFIRM_MAX_ROWS = IMPORT_PREVIEW_MAX_ROWS;

export class ImportConfirmInputError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ImportConfirmInputError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function toPrismaSourceType(sourceType: ImportSourceType): SourceType {
  const map: Record<ImportSourceType, SourceType> = {
    manual: SourceType.MANUAL,
    excel: SourceType.EXCEL,
    csv: SourceType.CSV,
    google_sheets: SourceType.GOOGLE_SHEETS,
    dodo_api: SourceType.DODO_API,
    seed: SourceType.SEED,
  };
  return map[sourceType];
}

function toPrismaValueType(valueType: AnalyticsFact["valueType"]): AnalyticsValueType {
  const map: Record<AnalyticsFact["valueType"], AnalyticsValueType> = {
    fact: AnalyticsValueType.FACT,
    plan: AnalyticsValueType.PLAN,
    forecast: AnalyticsValueType.FORECAST,
    business_plan: AnalyticsValueType.BUSINESS_PLAN,
  };
  return map[valueType];
}

function buildImportBatchSource(sourceType: ImportSourceType, idempotencyKey?: string): string {
  return idempotencyKey ? `import_confirm:${idempotencyKey}` : `import_confirm:${sourceType}`;
}

function toConfirmBatch(batch: {
  id: string;
  sourceType: SourceType;
  status: ImportStatus;
  rowsTotal: number;
  rowsImported: number;
  rowsFailed: number;
  startedAt: Date;
  finishedAt: Date | null;
}): ImportConfirmBatch {
  return {
    id: batch.id,
    sourceType: batch.sourceType.toLowerCase() as ImportSourceType,
    status: batch.status.toLowerCase() as ImportConfirmBatch["status"],
    rowsTotal: batch.rowsTotal,
    rowsImported: batch.rowsImported,
    rowsFailed: batch.rowsFailed,
    startedAt: batch.startedAt.toISOString(),
    finishedAt: batch.finishedAt ? batch.finishedAt.toISOString() : null,
  };
}

function toSavedFactsResult(facts: AnalyticsFact[], importBatchId: string): AnalyticsFact[] {
  return facts.map((fact) => ({
    ...fact,
    importBatchId,
  }));
}

function buildRejectedResult(input: {
  errors: ImportPreviewIssue[];
  summary: ImportConfirmRowsResult["summary"];
}): ImportConfirmRowsResult {
  return {
    importBatch: null,
    savedFacts: [],
    errors: input.errors,
    summary: input.summary,
    meta: {
      generatedAt: new Date().toISOString(),
      source: "import_confirm",
      persisted: false,
      rejected: true,
    },
  };
}

async function findExistingImportBatch(sourceType: ImportSourceType, idempotencyKey: string, userId?: string) {
  return db.importBatch.findFirst({
    where: {
      sourceType: toPrismaSourceType(sourceType),
      source: buildImportBatchSource(sourceType, idempotencyKey),
      importedById: userId,
    },
    include: {
      analyticsFacts: true,
      rowErrors: true,
    },
    orderBy: {
      startedAt: "desc",
    },
  });
}

export async function confirmImportRows(input: ImportConfirmRowsInput, userId?: string): Promise<ImportConfirmRowsResult> {
  if (!Array.isArray(input.rows)) {
    throw new ImportConfirmInputError("invalid_rows", "Rows must be an array", 400);
  }

  if (input.rows.length === 0) {
    throw new ImportConfirmInputError("empty_rows", "Rows must not be empty", 422);
  }

  if (input.rows.length > IMPORT_CONFIRM_MAX_ROWS) {
    throw new ImportConfirmInputError("confirm_rows_limit_exceeded", "Confirm row limit exceeded", 400, {
      maxRows: IMPORT_CONFIRM_MAX_ROWS,
      receivedRows: input.rows.length,
    });
  }

  if (input.idempotencyKey) {
    const existingBatch = await findExistingImportBatch(input.sourceType as ImportSourceType, input.idempotencyKey, userId);
    if (existingBatch) {
      const errors = existingBatch.rowErrors.map<ImportPreviewIssue>((rowError) => ({
        rowIndex: rowError.rowNumber,
        field: rowError.field ?? undefined,
        message: rowError.message,
        severity: rowError.code.toLowerCase() === "warning" ? "warning" : "error",
      }));

      return {
        importBatch: toConfirmBatch(existingBatch),
        savedFacts: existingBatch.analyticsFacts.map((fact) => ({
          date: fact.date.toISOString(),
          country: fact.country,
          region: fact.region,
          unitId: fact.unitId,
          metricKey: fact.metricKey,
          article: fact.article,
          valueType: fact.valueType.toLowerCase() as AnalyticsFact["valueType"],
          value: Number(fact.value),
          currency: fact.currency,
          sourceType: fact.sourceType.toLowerCase() as ImportSourceType,
          sourceId: fact.sourceId,
          importBatchId: fact.importBatchId,
        })),
        errors,
        summary: {
          totalRows: existingBatch.rowsTotal,
          validRows: Math.max(existingBatch.rowsImported - existingBatch.rowErrors.filter((item) => item.code === "WARNING").length, 0),
          warningRows: existingBatch.rowErrors.filter((item) => item.code === "WARNING").length,
          invalidRows: existingBatch.rowsFailed,
          errorsCount: existingBatch.rowErrors.filter((item) => item.code !== "WARNING").length,
        },
        meta: {
          generatedAt: new Date().toISOString(),
          source: "import_confirm",
          persisted: true,
          rejected: false,
          duplicate: true,
        },
      };
    }
  }

  let prepared;
  try {
    prepared = await prepareImportRows(input);
  } catch (error) {
    if (error instanceof ImportPreviewInputError) {
      throw new ImportConfirmInputError(error.code, error.message, error.status, error.details);
    }
    throw error;
  }

  if (prepared.summary.invalidRows > 0) {
    return buildRejectedResult({
      errors: prepared.errors,
      summary: prepared.summary,
    });
  }

  const factsToSave: AnalyticsFact[] = prepared.normalizedRows.map((row) => ({
    date: row.date,
    country: row.country,
    region: row.region,
    unitId: row.unitId,
    metricKey: row.metricKey,
    article: row.article,
    valueType: row.valueType,
    value: row.value,
    currency: row.currency,
    sourceType: prepared.sourceType,
  }));

  const batchSource = buildImportBatchSource(prepared.sourceType, input.idempotencyKey);
  const warnings = prepared.errors.filter((issue) => issue.severity === "warning");

  const saved = await db.$transaction(async (tx) => {
    const importBatch = await tx.importBatch.create({
      data: {
        sourceType: toPrismaSourceType(prepared.sourceType),
        source: batchSource,
        status: ImportStatus.RUNNING,
        rowsTotal: prepared.summary.totalRows,
        rowsImported: 0,
        rowsFailed: 0,
        importedById: userId,
        metaJson: {
          summary: prepared.summary,
          source: "import_confirm",
          idempotencyKey: input.idempotencyKey ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    const createdFacts = await tx.analyticsFact.createMany({
      data: factsToSave.map((fact) => ({
        date: new Date(fact.date),
        country: fact.country,
        region: fact.region,
        unitId: fact.unitId,
        metricKey: fact.metricKey,
        article: fact.article,
        valueType: toPrismaValueType(fact.valueType),
        value: fact.value,
        currency: fact.currency,
        sourceType: toPrismaSourceType(fact.sourceType as ImportSourceType),
        importBatchId: importBatch.id,
      })),
    });

    if (warnings.length > 0) {
      await tx.importRowError.createMany({
        data: warnings.map((issue) => ({
          importBatchId: importBatch.id,
          rowNumber: issue.rowIndex,
          field: issue.field,
          code: issue.severity.toUpperCase(),
          message: issue.message,
        })),
      });
    }

    const completedBatch = await tx.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: ImportStatus.COMPLETED,
        rowsImported: createdFacts.count,
        rowsFailed: 0,
        finishedAt: new Date(),
      },
    });

    return {
      importBatch: completedBatch,
      createdCount: createdFacts.count,
    };
  });

  return {
    importBatch: toConfirmBatch(saved.importBatch),
    savedFacts: toSavedFactsResult(factsToSave.slice(0, saved.createdCount), saved.importBatch.id),
    errors: warnings,
    summary: prepared.summary,
    meta: {
      generatedAt: new Date().toISOString(),
      source: "import_confirm",
      persisted: true,
      rejected: false,
    },
  };
}
