import type { AnalyticsFact } from "@/lib/analytics/model";
import type { DodoMetricRecord, DodoUnit } from "@/lib/integrations/dodo/types";

export function mapDodoUnitToAnalyticsUnit(unit: DodoUnit) {
  return {
    id: unit.id,
    name: unit.name,
    country: unit.country,
    region: unit.region ?? "unknown",
    externalId: unit.id,
    isActive: true,
  };
}

export function mapDodoMetricRecordToAnalyticsFact(record: DodoMetricRecord): AnalyticsFact {
  return {
    date: record.date,
    country: "unknown",
    region: "unknown",
    unitId: record.unitId,
    metricKey: record.metricKey,
    valueType: "fact",
    value: record.value,
    sourceType: "dodo_api",
  };
}
