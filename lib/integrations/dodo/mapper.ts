import type { AnalyticsFact } from "@/lib/analytics/model";
import type { NormalizedImportRow } from "@/lib/imports/types";
import type { DodoRawMetric, DodoSyncError, DodoSyncOptions } from "@/lib/integrations/dodo/types";

type DodoMapperOptions = {
  unitExternalIdToUnitId: Map<string, string>;
  allowedMetricKeys: Set<string>;
  country?: string;
};

type DodoMapperResult = {
  rows: NormalizedImportRow[];
  errors: DodoSyncError[];
};

function isDateValid(value: string): boolean {
  return Number.isFinite(new Date(value).getTime());
}

export function mapDodoMetricsToNormalizedRows(
  rawMetrics: DodoRawMetric[],
  options: DodoMapperOptions,
): DodoMapperResult {
  const rows: NormalizedImportRow[] = [];
  const errors: DodoSyncError[] = [];

  for (const [index, metric] of rawMetrics.entries()) {
    const rowNumber = index + 1;
    const unitId = options.unitExternalIdToUnitId.get(metric.externalUnitId);

    if (!unitId) {
      errors.push({
        code: "UNKNOWN_UNIT",
        message: `Unknown unit externalId: ${metric.externalUnitId}`,
        externalUnitId: metric.externalUnitId,
        raw: metric.raw,
      });
      continue;
    }

    if (!options.allowedMetricKeys.has(metric.metricKey)) {
      errors.push({
        code: "UNKNOWN_METRIC",
        message: `Unknown metric key: ${metric.metricKey}`,
        externalUnitId: metric.externalUnitId,
        raw: metric.raw,
      });
      continue;
    }

    if (!isDateValid(metric.date)) {
      errors.push({
        code: "INVALID_DATE",
        message: `Invalid metric date: ${metric.date}`,
        externalUnitId: metric.externalUnitId,
        raw: metric.raw,
      });
      continue;
    }

    if (!Number.isFinite(metric.value)) {
      errors.push({
        code: "INVALID_VALUE",
        message: "Metric value is not finite",
        externalUnitId: metric.externalUnitId,
        raw: metric.raw,
      });
      continue;
    }

    rows.push({
      rowNumber,
      date: new Date(metric.date).toISOString(),
      country: options.country ?? "RU",
      region: null,
      unitName: metric.unitName ?? null,
      unitExternalId: metric.externalUnitId,
      metricKey: metric.metricKey,
      article: metric.metricKey,
      valueType: "fact",
      value: metric.value,
      currency: metric.currency ?? null,
      sourceType: "dodo_api",
      raw: metric.raw,
    });
  }

  return { rows, errors };
}

export function mapDodoMetricsToAnalyticsFacts(
  rawMetrics: DodoRawMetric[],
  importBatchId: string | undefined,
  options: DodoMapperOptions,
): { facts: AnalyticsFact[]; errors: DodoSyncError[] } {
  const mapped = mapDodoMetricsToNormalizedRows(rawMetrics, options);

  return {
    errors: mapped.errors,
    facts: mapped.rows.map((row) => ({
      date: row.date,
      country: row.country,
      region: row.region,
      unitId: options.unitExternalIdToUnitId.get(row.unitExternalId ?? "") ?? null,
      metricKey: row.metricKey,
      article: row.article,
      valueType: "fact",
      value: row.value,
      currency: row.currency,
      sourceType: "dodo_api",
      importBatchId,
    })),
  };
}

export function buildDefaultDodoSyncOptions(from: string, to: string, metrics: DodoSyncOptions["metrics"]): DodoSyncOptions {
  return {
    from,
    to,
    metrics,
    dryRun: true,
  };
}
