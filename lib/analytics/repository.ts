import type { DashboardFilters } from "@/lib/analytics/filters";
import { NotImplementedError } from "@/lib/analytics/model";
import type { AnalyticsFact, MetricDefinition, Unit } from "@/lib/analytics/model";
import { db } from "@/lib/db";
import { AnalyticsValueType, SourceType } from "@prisma/client";

export type AnalyticsFactWriteResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

export type AnalyticsRepository = {
  findFacts(filters: DashboardFilters): Promise<AnalyticsFact[]>;
  upsertFacts(facts: AnalyticsFact[]): Promise<AnalyticsFactWriteResult>;
  listUnits(filters?: Pick<DashboardFilters, "country" | "region" | "unitId">): Promise<Unit[]>;
  listMetricDefinitions(): Promise<MetricDefinition[]>;
};

function asIso(value: Date): string {
  return value.toISOString();
}

export function createPrismaAnalyticsRepository(): AnalyticsRepository {
  const valueTypeMap: Record<AnalyticsFact["valueType"], AnalyticsValueType> = {
    fact: AnalyticsValueType.FACT,
    plan: AnalyticsValueType.PLAN,
    forecast: AnalyticsValueType.FORECAST,
    business_plan: AnalyticsValueType.BUSINESS_PLAN,
  };
  const sourceTypeMap: Record<SourceType, AnalyticsFact["sourceType"]> = {
    [SourceType.MANUAL]: "manual",
    [SourceType.EXCEL]: "excel",
    [SourceType.CSV]: "csv",
    [SourceType.GOOGLE_SHEETS]: "google_sheets",
    [SourceType.DODO_API]: "dodo_api",
    [SourceType.SEED]: "seed",
  };

  return {
    async findFacts(filters) {
      const rows = await db.analyticsFact.findMany({
        where: {
          country: filters.country && filters.country !== "all" ? filters.country : undefined,
          region: filters.region && filters.region !== "all" ? filters.region : undefined,
          unitId: filters.unitId ?? undefined,
          date: {
            gte: new Date(filters.dateRange.from),
            lte: new Date(filters.dateRange.to),
          },
          valueType: {
            in: filters.valueTypes.map((valueType) => valueTypeMap[valueType]),
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      return rows.map((row) => ({
        id: row.id,
        date: asIso(row.date),
        country: row.country,
        region: row.region,
        unitId: row.unitId,
        metricKey: row.metricKey,
        article: row.article,
        valueType: row.valueType.toLowerCase() as AnalyticsFact["valueType"],
        value: Number(row.value),
        currency: row.currency,
        sourceType: sourceTypeMap[row.sourceType],
        sourceId: row.sourceId,
        importBatchId: row.importBatchId,
      }));
    },
    async upsertFacts() {
      throw new NotImplementedError("Prisma repository upsertFacts is not implemented yet");
    },
    async listUnits(filters) {
      const rows = await db.unit.findMany({
        where: {
          country: filters?.country && filters.country !== "all" ? filters.country : undefined,
          region: filters?.region && filters.region !== "all" ? filters.region : undefined,
          id: filters?.unitId ?? undefined,
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        country: row.country,
        region: row.region,
        externalId: row.externalId,
        isActive: row.isActive,
      }));
    },
    async listMetricDefinitions() {
      const rows = await db.metricArticle.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });

      return rows.map((row) => ({
        id: row.id,
        key: row.code,
        name: row.name,
        category: row.category ?? "unknown",
        article: row.article,
        unitType: row.unitType ?? "number",
        direction: row.direction.toLowerCase() as MetricDefinition["direction"],
        format: row.format.toLowerCase() as MetricDefinition["format"],
        isActive: row.active,
      }));
    },
  };
}

export function createNotImplementedAnalyticsRepository(): AnalyticsRepository {
  return {
    async findFacts() {
      throw new NotImplementedError("Analytics repository is not wired to PostgreSQL yet");
    },
    async upsertFacts() {
      throw new NotImplementedError("Analytics fact writes are not implemented yet");
    },
    async listUnits() {
      return [];
    },
    async listMetricDefinitions() {
      return [];
    },
  };
}

export async function getAnalyticsFacts(
  filters: DashboardFilters,
  repository: AnalyticsRepository = createNotImplementedAnalyticsRepository(),
): Promise<AnalyticsFact[]> {
  return repository.findFacts(filters);
}

export async function getMetricDefinitions(
  repository: AnalyticsRepository = createNotImplementedAnalyticsRepository(),
): Promise<MetricDefinition[]> {
  return repository.listMetricDefinitions();
}

export async function getUnits(
  scope?: Pick<DashboardFilters, "country" | "region" | "unitId">,
  repository: AnalyticsRepository = createNotImplementedAnalyticsRepository(),
): Promise<Unit[]> {
  return repository.listUnits(scope);
}
