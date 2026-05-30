import type { AnalyticsFact } from "@/lib/analytics/model";
import type { DodoRawMetric, DodoUnit } from "@/lib/integrations/dodo/types";

export function mapDodoUnitToAnalyticsUnit(unit: DodoUnit) {
  return {
    id: unit.id,
    name: unit.name,
    country: unit.country,
    region: unit.region ?? null,
    externalId: unit.id,
    isActive: true,
  };
}

export function mapDodoMetricRecordToAnalyticsFact(record: DodoRawMetric): AnalyticsFact {
  return {
    date: record.date,
    country: "unknown",
    region: null,
    unitId: record.unitId,
    metricKey: record.metricKey,
    valueType: "fact",
    value: record.value,
    currency: record.currency,
    sourceType: "dodo_api",
  };
}

export function mapDodoMetricsToAnalyticsFacts(records: DodoRawMetric[]): AnalyticsFact[] {
  return records.map(mapDodoMetricRecordToAnalyticsFact);
}
