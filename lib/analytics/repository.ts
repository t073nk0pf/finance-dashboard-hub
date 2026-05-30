import type { DashboardFilters } from "@/lib/analytics/filters";
import { NotImplementedError } from "@/lib/analytics/model";
import type { AnalyticsFact, MetricDefinition, Unit } from "@/lib/analytics/model";

export type AnalyticsFactWriteResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

export type AnalyticsRepository = {
  findFacts(filters: DashboardFilters): Promise<AnalyticsFact[]>;
  upsertFacts(facts: AnalyticsFact[]): Promise<AnalyticsFactWriteResult>;
  listUnits(filters?: Pick<DashboardFilters, "country" | "region">): Promise<Unit[]>;
  listMetricDefinitions(): Promise<MetricDefinition[]>;
};

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
