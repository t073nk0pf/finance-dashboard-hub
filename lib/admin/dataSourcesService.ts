import { DataSourceStatus, ImportStatus, Prisma, SourceType } from "@prisma/client";
import { db } from "@/lib/db";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type AdminPagination = {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
};

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
  batchesPagination: AdminPagination;
  errorsPagination: AdminPagination;
  filters: {
    batchStatus?: string;
    batchFrom?: string;
    batchTo?: string;
  };
};

export type AdminDataSourceFilters = {
  type?: string;
  status?: string;
  search?: string;
  limit: number;
  offset: number;
  warnings: string[];
};

export type AdminImportBatchFilters = {
  sourceId?: string;
  sourceType?: string;
  status?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
  warnings: string[];
};

export type AdminDataSourceDetailsFilters = {
  batchStatus?: string;
  batchFrom?: string;
  batchTo?: string;
  batchLimit: number;
  batchOffset: number;
  errorLimit: number;
  errorOffset: number;
  warnings: string[];
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

function sanitizeLimit(value: string | null, warnings: string[], fallback = DEFAULT_LIMIT): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    warnings.push("invalid_limit");
    return fallback;
  }
  if (parsed > MAX_LIMIT) {
    warnings.push("limit_capped_to_max");
    return MAX_LIMIT;
  }
  return parsed;
}

function sanitizeOffset(value: string | null, warnings: string[]): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    warnings.push("invalid_offset");
    return 0;
  }
  return parsed;
}

function normalizeEnumValue<T extends string>(value: string | null, allowed: readonly T[], warnings: string[], warningLabel: string): T | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  const found = allowed.find((candidate) => candidate === normalized);
  if (!found) {
    warnings.push(warningLabel);
    return undefined;
  }
  return found;
}

function parseIsoDate(value: string | null, warnings: string[], warningLabel: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    warnings.push(warningLabel);
    return undefined;
  }
  return date.toISOString();
}

function maybeBoundedDateRange(fromIso: string | undefined, toIso: string | undefined, warnings: string[]): { fromIso?: string; toIso?: string } {
  if (!fromIso || !toIso) return { fromIso, toIso };
  if (new Date(fromIso).getTime() > new Date(toIso).getTime()) {
    warnings.push("invalid_date_range");
    return {};
  }
  return { fromIso, toIso };
}

function toPagination(limit: number, offset: number, total: number): AdminPagination {
  return {
    limit,
    offset,
    total,
    hasMore: offset + limit < total,
  };
}

export function normalizeAdminDataSourceFilters(searchParams: URLSearchParams): AdminDataSourceFilters {
  const warnings: string[] = [];
  const limit = sanitizeLimit(searchParams.get("limit"), warnings);
  const offset = sanitizeOffset(searchParams.get("offset"), warnings);
  const typeEnum = normalizeEnumValue(searchParams.get("type"), Object.values(SourceType), warnings, "invalid_type");
  const statusEnum = normalizeEnumValue(searchParams.get("status"), Object.values(DataSourceStatus), warnings, "invalid_status");
  const searchRaw = searchParams.get("search")?.trim() ?? "";
  const search = searchRaw.length ? searchRaw.slice(0, 128) : undefined;

  return {
    type: typeEnum ? toLowerEnum(typeEnum) : undefined,
    status: statusEnum ? toLowerEnum(statusEnum) : undefined,
    search,
    limit,
    offset,
    warnings,
  };
}

export function normalizeAdminImportBatchFilters(searchParams: URLSearchParams): AdminImportBatchFilters {
  const warnings: string[] = [];
  const limit = sanitizeLimit(searchParams.get("limit"), warnings);
  const offset = sanitizeOffset(searchParams.get("offset"), warnings);
  const statusEnum = normalizeEnumValue(searchParams.get("status"), Object.values(ImportStatus), warnings, "invalid_status");
  const sourceTypeEnum = normalizeEnumValue(searchParams.get("sourceType"), Object.values(SourceType), warnings, "invalid_source_type");
  const sourceId = searchParams.get("sourceId")?.trim() || undefined;
  const fromIso = parseIsoDate(searchParams.get("from"), warnings, "invalid_from_date");
  const toIso = parseIsoDate(searchParams.get("to"), warnings, "invalid_to_date");
  const bounded = maybeBoundedDateRange(fromIso, toIso, warnings);

  return {
    sourceId,
    sourceType: sourceTypeEnum ? toLowerEnum(sourceTypeEnum) : undefined,
    status: statusEnum ? toLowerEnum(statusEnum) : undefined,
    from: bounded.fromIso ? bounded.fromIso.slice(0, 10) : undefined,
    to: bounded.toIso ? bounded.toIso.slice(0, 10) : undefined,
    limit,
    offset,
    warnings,
  };
}

export function normalizeAdminDataSourceDetailsFilters(searchParams: URLSearchParams): AdminDataSourceDetailsFilters {
  const warnings: string[] = [];
  const batchLimit = sanitizeLimit(searchParams.get("batchLimit"), warnings);
  const batchOffset = sanitizeOffset(searchParams.get("batchOffset"), warnings);
  const errorLimit = sanitizeLimit(searchParams.get("errorLimit"), warnings);
  const errorOffset = sanitizeOffset(searchParams.get("errorOffset"), warnings);
  const batchStatusEnum = normalizeEnumValue(searchParams.get("batchStatus"), Object.values(ImportStatus), warnings, "invalid_batch_status");
  const batchFromIso = parseIsoDate(searchParams.get("batchFrom"), warnings, "invalid_batch_from_date");
  const batchToIso = parseIsoDate(searchParams.get("batchTo"), warnings, "invalid_batch_to_date");
  const bounded = maybeBoundedDateRange(batchFromIso, batchToIso, warnings);

  return {
    batchStatus: batchStatusEnum ? toLowerEnum(batchStatusEnum) : undefined,
    batchFrom: bounded.fromIso ? bounded.fromIso.slice(0, 10) : undefined,
    batchTo: bounded.toIso ? bounded.toIso.slice(0, 10) : undefined,
    batchLimit,
    batchOffset,
    errorLimit,
    errorOffset,
    warnings,
  };
}

type ListDataSourcesInput = Omit<AdminDataSourceFilters, "warnings">;
type ListBatchesInput = Omit<AdminImportBatchFilters, "warnings">;
type ListSourceBatchesInput = {
  sourceId: string;
  status?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};
type ListSourceErrorsInput = {
  sourceId: string;
  limit: number;
  offset: number;
};

function mapDataSource(source: {
  id: string;
  name: string;
  type: SourceType;
  status: DataSourceStatus;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  configJson: Prisma.JsonValue | null;
  importBatches: Array<{ id: string; rowsImported: number; rowsFailed: number }>;
}): AdminDataSourceItem {
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
}

function mapImportBatch(batch: {
  id: string;
  sourceId: string | null;
  sourceType: SourceType;
  status: ImportStatus;
  rowsTotal: number;
  rowsImported: number;
  rowsFailed: number;
  startedAt: Date;
  finishedAt: Date | null;
  importedBy: { email: string } | null;
  rowErrors: Array<{ id: string }>;
}): AdminImportBatchItem {
  return {
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
  };
}

function toSourceTypeEnum(value?: string): SourceType | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  return Object.values(SourceType).includes(normalized as SourceType) ? (normalized as SourceType) : undefined;
}

function toDataSourceStatusEnum(value?: string): DataSourceStatus | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  return Object.values(DataSourceStatus).includes(normalized as DataSourceStatus) ? (normalized as DataSourceStatus) : undefined;
}

function toImportStatusEnum(value?: string): ImportStatus | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase();
  return Object.values(ImportStatus).includes(normalized as ImportStatus) ? (normalized as ImportStatus) : undefined;
}

function dateWhere(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  const where: Prisma.DateTimeFilter = {};
  if (from) where.gte = new Date(from);
  if (to) where.lte = new Date(`${to}T23:59:59.999Z`);
  return where.gte || where.lte ? where : undefined;
}

export async function listAdminDataSources(filters: ListDataSourcesInput): Promise<{ items: AdminDataSourceItem[]; pagination: AdminPagination }> {
  const where: Prisma.DataSourceWhereInput = {
    type: toSourceTypeEnum(filters.type),
    status: toDataSourceStatusEnum(filters.status),
    OR: filters.search
      ? [{ id: { contains: filters.search, mode: "insensitive" } }, { name: { contains: filters.search, mode: "insensitive" } }, { type: { equals: toSourceTypeEnum(filters.search) } }]
      : undefined,
  };

  const [total, sources] = await Promise.all([
    db.dataSource.count({ where }),
    db.dataSource.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: filters.offset,
      take: filters.limit,
      include: {
        importBatches: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: {
            id: true,
            rowsImported: true,
            rowsFailed: true,
          },
        },
      },
    }),
  ]);

  return {
    items: sources.map(mapDataSource),
    pagination: toPagination(filters.limit, filters.offset, total),
  };
}

export async function getAdminDataSourcesSummary(filters: Omit<ListDataSourcesInput, "limit" | "offset">): Promise<AdminDataSourcesSummary> {
  const where: Prisma.DataSourceWhereInput = {
    type: toSourceTypeEnum(filters.type),
    status: toDataSourceStatusEnum(filters.status),
    OR: filters.search
      ? [{ id: { contains: filters.search, mode: "insensitive" } }, { name: { contains: filters.search, mode: "insensitive" } }, { type: { equals: toSourceTypeEnum(filters.search) } }]
      : undefined,
  };

  const [total, active, failed, neverSynced] = await Promise.all([
    db.dataSource.count({ where }),
    db.dataSource.count({ where: { ...where, status: DataSourceStatus.ACTIVE } }),
    db.dataSource.count({ where: { ...where, status: DataSourceStatus.ERROR } }),
    db.dataSource.count({ where: { ...where, lastSyncAt: null } }),
  ]);

  return { total, active, failed, neverSynced };
}

export async function listAdminImportBatches(filters: ListBatchesInput): Promise<{ items: AdminImportBatchItem[]; pagination: AdminPagination }> {
  const where: Prisma.ImportBatchWhereInput = {
    sourceId: filters.sourceId ?? undefined,
    sourceType: toSourceTypeEnum(filters.sourceType),
    status: toImportStatusEnum(filters.status),
    startedAt: dateWhere(filters.from, filters.to),
  };

  const [total, batches] = await Promise.all([
    db.importBatch.count({ where }),
    db.importBatch.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: filters.offset,
      take: filters.limit,
      include: {
        importedBy: {
          select: { email: true },
        },
        rowErrors: {
          select: { id: true },
        },
      },
    }),
  ]);

  return {
    items: batches.map(mapImportBatch),
    pagination: toPagination(filters.limit, filters.offset, total),
  };
}

export async function getAdminImportBatchesSummary(filters: Omit<ListBatchesInput, "limit" | "offset">): Promise<AdminImportBatchesSummary> {
  const where: Prisma.ImportBatchWhereInput = {
    sourceId: filters.sourceId ?? undefined,
    sourceType: toSourceTypeEnum(filters.sourceType),
    status: toImportStatusEnum(filters.status),
    startedAt: dateWhere(filters.from, filters.to),
  };

  const [total, completed, failed, running, draft] = await Promise.all([
    db.importBatch.count({ where }),
    db.importBatch.count({
      where: {
        ...where,
        status: { in: [ImportStatus.COMPLETED, ImportStatus.COMPLETED_WITH_ERRORS] },
      },
    }),
    db.importBatch.count({ where: { ...where, status: ImportStatus.FAILED } }),
    db.importBatch.count({ where: { ...where, status: ImportStatus.RUNNING } }),
    db.importBatch.count({ where: { ...where, status: ImportStatus.PENDING } }),
  ]);

  return { total, completed, failed, running, draft };
}

export async function listRecentImportBatchesForSource(input: ListSourceBatchesInput): Promise<{ items: AdminImportBatchItem[]; pagination: AdminPagination }> {
  return listAdminImportBatches({
    sourceId: input.sourceId,
    status: input.status,
    from: input.from,
    to: input.to,
    limit: input.limit,
    offset: input.offset,
  });
}

export async function listRecentImportErrorsForSource(input: ListSourceErrorsInput): Promise<{
  items: AdminDataSourceDetails["recentErrors"];
  pagination: AdminPagination;
}> {
  try {
    const where: Prisma.ImportRowErrorWhereInput = {
      importBatch: {
        sourceId: input.sourceId,
      },
    };
    const [total, errors] = await Promise.all([
      db.importRowError.count({ where }),
      db.importRowError.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: input.offset,
        take: input.limit,
      }),
    ]);

    return {
      items: errors.map((error) => ({
        id: error.id,
        importBatchId: error.importBatchId,
        rowNumber: error.rowNumber,
        field: error.field ?? null,
        message: error.message,
        severity: error.code.toLowerCase(),
        createdAt: error.createdAt.toISOString(),
      })),
      pagination: toPagination(input.limit, input.offset, total),
    };
  } catch {
    return {
      items: [],
      pagination: toPagination(input.limit, input.offset, 0),
    };
  }
}

export async function getAdminDataSourceSummary(sourceId: string, filters: { batchStatus?: string; batchFrom?: string; batchTo?: string }): Promise<AdminDataSourceDetails["summary"]> {
  const where: Prisma.ImportBatchWhereInput = {
    sourceId,
    status: toImportStatusEnum(filters.batchStatus),
    startedAt: dateWhere(filters.batchFrom, filters.batchTo),
  };
  const [counts, totals, lastImport] = await Promise.all([
    db.importBatch.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    db.importBatch.aggregate({
      where,
      _sum: {
        rowsImported: true,
        rowsFailed: true,
      },
      _count: {
        _all: true,
      },
    }),
    db.importBatch.findFirst({
      where,
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);

  const completedCount = counts
    .filter((item) => item.status === ImportStatus.COMPLETED || item.status === ImportStatus.COMPLETED_WITH_ERRORS)
    .reduce((acc, item) => acc + item._count._all, 0);

  return {
    batchesTotal: totals._count._all,
    completed: completedCount,
    failed: counts.find((item) => item.status === ImportStatus.FAILED)?._count._all ?? 0,
    running: counts.find((item) => item.status === ImportStatus.RUNNING)?._count._all ?? 0,
    rowsImported: totals._sum.rowsImported ?? 0,
    rowsFailed: totals._sum.rowsFailed ?? 0,
    lastImportAt: lastImport?.startedAt.toISOString() ?? null,
  };
}

export async function getAdminDataSourceDetails(id: string, filters: Omit<AdminDataSourceDetailsFilters, "warnings">): Promise<AdminDataSourceDetails | null> {
  const source = await db.dataSource.findUnique({
    where: { id },
  });
  if (!source) return null;

  const [summary, recentBatches, recentErrors] = await Promise.all([
    getAdminDataSourceSummary(id, {
      batchStatus: filters.batchStatus,
      batchFrom: filters.batchFrom,
      batchTo: filters.batchTo,
    }),
    listRecentImportBatchesForSource({
      sourceId: id,
      status: filters.batchStatus,
      from: filters.batchFrom,
      to: filters.batchTo,
      limit: filters.batchLimit,
      offset: filters.batchOffset,
    }),
    listRecentImportErrorsForSource({
      sourceId: id,
      limit: filters.errorLimit,
      offset: filters.errorOffset,
    }),
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
    recentBatches: recentBatches.items,
    recentErrors: recentErrors.items,
    batchesPagination: recentBatches.pagination,
    errorsPagination: recentErrors.pagination,
    filters: {
      batchStatus: filters.batchStatus,
      batchFrom: filters.batchFrom,
      batchTo: filters.batchTo,
    },
  };
}
