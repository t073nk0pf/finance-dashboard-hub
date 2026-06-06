import { ImportStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { createImportBatch, saveAnalyticsFacts, saveImportRowErrors } from "@/lib/imports/service";
import type { ImportValidationError } from "@/lib/imports/types";
import { validateImportRows } from "@/lib/imports/validation";
import { createDodoClient, DodoConfigError, DodoNotImplementedError, fetchDodoMetrics } from "@/lib/integrations/dodo/client";
import { mapDodoMetricsToNormalizedRows } from "@/lib/integrations/dodo/mapper";
import type { DodoApiConfig, DodoSyncError, DodoSyncOptions, DodoSyncResult } from "@/lib/integrations/dodo/types";

function nowIso(): string {
  return new Date().toISOString();
}

function mapSyncErrorsToImportErrors(errors: DodoSyncError[]): ImportValidationError[] {
  return errors.map((error, index) => ({
    rowNumber: index + 1,
    field: error.externalUnitId ? "unitExternalId" : "metricKey",
    message: `${error.code}: ${error.message}`,
    severity: "error",
  }));
}

function readDodoConfig(): DodoApiConfig {
  return {
    baseUrl: process.env.DODO_API_BASE_URL ?? "",
    clientId: process.env.DODO_API_CLIENT_ID,
    clientSecret: process.env.DODO_API_CLIENT_SECRET,
    accessToken: process.env.DODO_API_ACCESS_TOKEN,
    refreshToken: process.env.DODO_API_REFRESH_TOKEN,
    organizationId: process.env.DODO_API_ORGANIZATION_ID,
    timeoutMs: process.env.DODO_API_TIMEOUT_MS ? Number(process.env.DODO_API_TIMEOUT_MS) : undefined,
  };
}

async function resolveUnitMap(externalIds: string[]): Promise<Map<string, string>> {
  const units = await db.unit.findMany({
    where: {
      externalId: {
        in: externalIds,
      },
      isActive: true,
    },
    select: {
      id: true,
      externalId: true,
    },
  });

  return new Map(units.filter((unit) => unit.externalId).map((unit) => [unit.externalId as string, unit.id]));
}

async function resolveMetricSet(): Promise<Set<string>> {
  const metrics = await db.metricArticle.findMany({
    where: { active: true },
    select: { code: true },
  });
  return new Set(metrics.map((metric) => metric.code));
}

async function finalizeBatch(importBatchId: string, status: ImportStatus, rowsImported: number, rowsFailed: number): Promise<void> {
  await db.importBatch.update({
    where: { id: importBatchId },
    data: {
      status,
      rowsImported,
      rowsFailed,
      finishedAt: new Date(),
    },
  });
}

export async function syncDodoMetrics(options: DodoSyncOptions, userId?: string): Promise<DodoSyncResult> {
  const startedAt = nowIso();
  const dryRun = options.dryRun ?? false;
  const config = readDodoConfig();

  let rawMetrics: Awaited<ReturnType<typeof fetchDodoMetrics>>;
  try {
    const client = createDodoClient(config);
    rawMetrics = await fetchDodoMetrics(client, options);
  } catch (error) {
    if (error instanceof DodoConfigError || error instanceof DodoNotImplementedError) {
      return {
        status: dryRun ? "not_configured" : "error",
        rowsFetched: 0,
        rowsMapped: 0,
        rowsFailed: 0,
        errors: [
          {
            code: error.name,
            message: error.message,
          },
        ],
        startedAt,
        finishedAt: nowIso(),
      };
    }
    throw error;
  }

  const unitMap = await resolveUnitMap(rawMetrics.map((metric) => metric.externalUnitId));
  const metricSet = await resolveMetricSet();
  const mapped = mapDodoMetricsToNormalizedRows(rawMetrics, {
    unitExternalIdToUnitId: unitMap,
    allowedMetricKeys: metricSet,
    country: options.country,
  });

  const validation = validateImportRows(mapped.rows, {
    allowUnknownMetrics: false,
    allowUnknownUnits: false,
    strictMetricDefinitions: true,
    knownMetricKeys: Array.from(metricSet),
  });

  const allErrors: DodoSyncError[] = [
    ...mapped.errors,
    ...validation.errors.map((error) => ({
      code: "VALIDATION_ERROR",
      message: error.message,
    })),
  ];

  if (dryRun) {
    return {
      status: allErrors.length ? "error" : "dry_run",
      rowsFetched: rawMetrics.length,
      rowsMapped: mapped.rows.length,
      rowsFailed: allErrors.length,
      errors: allErrors,
      startedAt,
      finishedAt: nowIso(),
    };
  }

  const importBatch = await createImportBatch({
    sourceType: "dodo_api",
    source: "dodo_api",
    rowsTotal: rawMetrics.length,
    createdById: userId,
    meta: {
      from: options.from,
      to: options.to,
      metrics: options.metrics,
      units: options.units,
      country: options.country,
      integration: "dodo_api",
    },
  });

  const validRows = mapped.rows.filter((row) => !validation.errors.some((error) => error.rowNumber === row.rowNumber));
  const facts = validRows.map((row) => ({
    date: row.date,
    country: row.country,
    region: row.region,
    unitId: row.unitExternalId ? unitMap.get(row.unitExternalId) ?? null : null,
    metricKey: row.metricKey,
    article: row.article,
    valueType: row.valueType,
    value: row.value,
    currency: row.currency,
    sourceType: "dodo_api" as const,
    importBatchId: importBatch.id,
  }));

  const rowsImported = await saveAnalyticsFacts(facts);
  const importErrors = [...validation.errors, ...mapSyncErrorsToImportErrors(mapped.errors)];
  await saveImportRowErrors(importBatch.id, importErrors);

  const rowsFailed = importErrors.length;
  const status =
    rowsFailed > 0 && rowsImported > 0
      ? ImportStatus.COMPLETED_WITH_ERRORS
      : rowsFailed > 0
        ? ImportStatus.FAILED
        : ImportStatus.COMPLETED;

  await finalizeBatch(importBatch.id, status, rowsImported, rowsFailed);

  return {
    status: rowsFailed > 0 ? "error" : "ok",
    rowsFetched: rawMetrics.length,
    rowsMapped: facts.length,
    rowsFailed,
    importBatchId: importBatch.id,
    errors: allErrors,
    startedAt,
    finishedAt: nowIso(),
  };
}
