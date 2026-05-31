import { DataSourceStatus, ImportStatus, SourceType } from "@prisma/client";
import { db } from "@/lib/db";

export type AdminDataSourceItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSyncAt: string | null;
  lastImportBatchId: string | null;
  rowsImported: number;
  rowsFailed: number;
  createdAt: string;
  updatedAt: string;
  meta: Record<string, unknown> | null;
};

export type AdminDataSourcesSummary = {
  total: number;
  active: number;
  failed: number;
  neverSynced: number;
};

export type AdminImportBatchItem = {
  id: string;
  sourceId: string | null;
  sourceType: string;
  status: string;
  rowsTotal: number;
  rowsImported: number;
  rowsFailed: number;
  startedAt: string;
  finishedAt: string | null;
  createdBy: string | null;
  errorSummary: string | null;
};

export type AdminImportBatchesSummary = {
  total: number;
  completed: number;
  failed: number;
  running: number;
  draft: number;
};

export type AdminDataSourceDetails = {
  source: {
    id: string;
    name: string;
    type: string;
    status: string;
    lastSyncAt: string | null;
    createdAt: string;
    updatedAt: string;
    meta: Record<string, unknown> | null;
  };
  summary: {
    batchesTotal: number;
    completed: number;
    failed: number;
    running: number;
    rowsImported: number;
    rowsFailed: number;
    lastImportAt: string | null;
  };
  recentBatches: AdminImportBatchItem[];
  recentErrors: Array<{
    id: string;
    importBatchId: string;
    rowNumber: number;
    field: string | null;
    message: string;
    severity: string;
    createdAt: string;
  }>;
};

function toLowerEnum(value: string): string {
  return value.toLowerCase();
}

function parseMeta(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  return meta as Record<string, unknown>;
}

function buildErrorSummary(rowsFailed: number, rowErrorsCount: number): string | null {
  if (rowsFailed <= 0 && rowErrorsCount <= 0) return null;
  return `failed rows: ${rowsFailed}, errors: ${rowErrorsCount}`;
}

export async function listAdminDataSources(): Promise<AdminDataSourceItem[]> {
  const sources = await db.dataSource.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      importBatches: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  return sources.map((source) => {
    const lastBatch = source.importBatches[0];
    return {
      id: source.id,
      name: source.name,
      type: toLowerEnum(source.type),
      status: toLowerEnum(source.status),
      lastSyncAt: source.lastSyncAt?.toISOString() ?? null,
      lastImportBatchId: lastBatch?.id ?? null,
      rowsImported: lastBatch?.rowsImported ?? 0,
      rowsFailed: lastBatch?.rowsFailed ?? 0,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      meta: parseMeta(source.configJson),
    };
  });
}

export function getAdminDataSourcesSummary(sources: AdminDataSourceItem[]): AdminDataSourcesSummary {
  return {
    total: sources.length,
    active: sources.filter((item) => item.status === toLowerEnum(DataSourceStatus.ACTIVE)).length,
    failed: sources.filter((item) => item.status === toLowerEnum(DataSourceStatus.ERROR)).length,
    neverSynced: sources.filter((item) => !item.lastSyncAt).length,
  };
}

type ListBatchesInput = {
  sourceId?: string;
  status?: string;
  limit?: number;
};

function toImportStatus(status?: string): ImportStatus | undefined {
  if (!status) return undefined;
  const normalized = status.trim().toUpperCase();
  return Object.values(ImportStatus).includes(normalized as ImportStatus) ? (normalized as ImportStatus) : undefined;
}

export async function listAdminImportBatches(input: ListBatchesInput = {}): Promise<AdminImportBatchItem[]> {
  const limit = Number.isFinite(input.limit) ? Math.min(Math.max(Number(input.limit), 1), 200) : 50;
  const status = toImportStatus(input.status);

  const batches = await db.importBatch.findMany({
    where: {
      sourceId: input.sourceId ?? undefined,
      status: status ?? undefined,
    },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      importedBy: {
        select: { email: true },
      },
      rowErrors: {
        select: { id: true },
      },
    },
  });

  return batches.map((batch) => ({
    id: batch.id,
    sourceId: batch.sourceId ?? null,
    sourceType: toLowerEnum(batch.sourceType),
    status: toLowerEnum(batch.status),
    rowsTotal: batch.rowsTotal,
    rowsImported: batch.rowsImported,
    rowsFailed: batch.rowsFailed,
    startedAt: batch.startedAt.toISOString(),
    finishedAt: batch.finishedAt?.toISOString() ?? null,
    createdBy: batch.importedBy?.email ?? null,
    errorSummary: buildErrorSummary(batch.rowsFailed, batch.rowErrors.length),
  }));
}

export function getAdminImportBatchesSummary(batches: AdminImportBatchItem[]): AdminImportBatchesSummary {
  return {
    total: batches.length,
    completed: batches.filter((item) => item.status === toLowerEnum(ImportStatus.COMPLETED) || item.status === toLowerEnum(ImportStatus.COMPLETED_WITH_ERRORS)).length,
    failed: batches.filter((item) => item.status === toLowerEnum(ImportStatus.FAILED)).length,
    running: batches.filter((item) => item.status === toLowerEnum(ImportStatus.RUNNING)).length,
    draft: batches.filter((item) => item.status === toLowerEnum(ImportStatus.PENDING)).length,
  };
}

export function isValidSourceType(value?: string): value is SourceType {
  if (!value) return false;
  const normalized = value.trim().toUpperCase();
  return Object.values(SourceType).includes(normalized as SourceType);
}

export async function listRecentImportBatchesForSource(sourceId: string, limit = 20): Promise<AdminImportBatchItem[]> {
  return listAdminImportBatches({
    sourceId,
    limit,
  });
}

export async function listRecentImportErrorsForSource(
  sourceId: string,
  limit = 50,
): Promise<
  Array<{
    id: string;
    importBatchId: string;
    rowNumber: number;
    field: string | null;
    message: string;
    severity: string;
    createdAt: string;
  }>
> {
  try {
    const errors = await db.importRowError.findMany({
      where: {
        importBatch: {
          sourceId,
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return errors.map((error) => ({
      id: error.id,
      importBatchId: error.importBatchId,
      rowNumber: error.rowNumber,
      field: error.field ?? null,
      message: error.message,
      severity: error.code.toLowerCase(),
      createdAt: error.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getAdminDataSourceSummary(sourceId: string): Promise<AdminDataSourceDetails["summary"]> {
  const batches = await db.importBatch.findMany({
    where: { sourceId },
    orderBy: { startedAt: "desc" },
    select: {
      status: true,
      rowsImported: true,
      rowsFailed: true,
      startedAt: true,
    },
  });

  return {
    batchesTotal: batches.length,
    completed: batches.filter((batch) => batch.status === ImportStatus.COMPLETED || batch.status === ImportStatus.COMPLETED_WITH_ERRORS).length,
    failed: batches.filter((batch) => batch.status === ImportStatus.FAILED).length,
    running: batches.filter((batch) => batch.status === ImportStatus.RUNNING).length,
    rowsImported: batches.reduce((acc, item) => acc + item.rowsImported, 0),
    rowsFailed: batches.reduce((acc, item) => acc + item.rowsFailed, 0),
    lastImportAt: batches[0]?.startedAt.toISOString() ?? null,
  };
}

export async function getAdminDataSourceDetails(id: string): Promise<AdminDataSourceDetails | null> {
  const source = await db.dataSource.findUnique({
    where: { id },
  });

  if (!source) return null;

  const [summary, recentBatches, recentErrors] = await Promise.all([
    getAdminDataSourceSummary(id),
    listRecentImportBatchesForSource(id, 20),
    listRecentImportErrorsForSource(id, 50),
  ]);

  return {
    source: {
      id: source.id,
      name: source.name,
      type: toLowerEnum(source.type),
      status: toLowerEnum(source.status),
      lastSyncAt: source.lastSyncAt?.toISOString() ?? null,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      meta: parseMeta(source.configJson),
    },
    summary,
    recentBatches,
    recentErrors,
  };
}
