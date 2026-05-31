import type { AnalyticsValueType } from "@/lib/analytics/model";
import { db } from "@/lib/db";
import {
  analyticsValueTypes,
  importSourceTypes,
  type ImportPreviewIssue,
  type ImportPreviewMapping,
  type ImportPreviewRowNormalized,
  type ImportPreviewRowResult,
  type ImportPreviewRowsInput,
  type ImportPreviewRowsResult,
  type ImportSourceType,
  type ImportValidationSeverity,
  type NormalizedImportRow,
} from "@/lib/imports/types";
import { validateImportRows } from "@/lib/imports/validation";

export const IMPORT_PREVIEW_MAX_ROWS = 500;

export class ImportPreviewInputError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(code: string, message: string, status = 400, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ImportPreviewInputError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const previewFieldAliases: Record<keyof ImportPreviewMapping, string[]> = {
  date: ["date", "day", "perioddate"],
  country: ["country", "market"],
  region: ["region", "city", "area"],
  unitId: ["unitid", "restaurantid", "storeid"],
  unitName: ["unit", "unitname", "restaurant", "restaurantname", "store", "storename"],
  externalUnitId: ["externalunitid", "unitexternalid", "externalid", "restaurantexternalid", "unitcode"],
  metricKey: ["metrickey", "metric", "metriccode"],
  article: ["article", "category", "metricarticle"],
  valueType: ["valuetype", "type"],
  value: ["value", "amount", "factvalue"],
  currency: ["currency", "unittype"],
};

type UnitLookup = {
  id: string;
  name: string;
  country: string;
  region: string | null;
  externalId: string | null;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function cleanString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function optionalString(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned ? cleaned : null;
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000).toISOString();
  }

  const cleaned = cleanString(value);
  if (!cleaned) return "";

  const parsed = new Date(cleaned);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : cleaned;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const cleaned = cleanString(value).replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return Number.NaN;
  return Number(cleaned);
}

function normalizeValueType(value: unknown): string {
  return cleanString(value).toLowerCase();
}

function resolveMappedValue(row: Record<string, unknown>, mapping: ImportPreviewMapping | undefined, field: keyof ImportPreviewMapping): unknown {
  const explicitField = mapping?.[field];
  if (explicitField && explicitField in row) return row[explicitField];

  const rowEntries = Object.entries(row);
  const aliases = previewFieldAliases[field].map(normalizeKey);
  const match = rowEntries.find(([key]) => aliases.includes(normalizeKey(key)));
  return match?.[1];
}

function buildIssue(rowIndex: number, message: string, severity: ImportValidationSeverity, field?: string): ImportPreviewIssue {
  return {
    rowIndex,
    field,
    message,
    severity,
  };
}

function toPreviewNormalized(row: NormalizedImportRow): ImportPreviewRowNormalized {
  return {
    date: row.date || null,
    unitId: row.unitId ?? null,
    unitName: row.unitName ?? null,
    externalUnitId: row.unitExternalId ?? null,
    metricKey: row.metricKey || null,
    value: Number.isFinite(row.value) ? row.value : null,
    valueType: row.valueType ? String(row.valueType) : null,
    sourceType: row.sourceType,
  };
}

function buildRowStatus(issues: ImportPreviewIssue[]): ImportPreviewRowResult["status"] {
  if (issues.some((issue) => issue.severity === "error")) return "invalid";
  if (issues.length > 0) return "warning";
  return "valid";
}

function buildEmptyResult(): ImportPreviewRowsResult {
  return {
    rowsPreview: [],
    errors: [],
    summary: {
      totalRows: 0,
      validRows: 0,
      warningRows: 0,
      invalidRows: 0,
      errorsCount: 0,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      source: "import_preview",
      persisted: false,
    },
  };
}

function resolveUnit(
  unitId: string | null,
  unitName: string | null,
  externalUnitId: string | null,
  lookups: {
    byId: Map<string, UnitLookup>;
    byName: Map<string, UnitLookup>;
    byExternalId: Map<string, UnitLookup>;
  },
): UnitLookup | null {
  if (unitId && lookups.byId.has(unitId)) return lookups.byId.get(unitId) ?? null;
  if (externalUnitId && lookups.byExternalId.has(externalUnitId.trim().toLowerCase())) {
    return lookups.byExternalId.get(externalUnitId.trim().toLowerCase()) ?? null;
  }
  if (unitName && lookups.byName.has(unitName.trim().toLowerCase())) {
    return lookups.byName.get(unitName.trim().toLowerCase()) ?? null;
  }
  return null;
}

function toNormalizedPreviewRow(
  row: Record<string, unknown>,
  rowIndex: number,
  sourceType: ImportSourceType,
  mapping: ImportPreviewMapping | undefined,
  lookups: {
    byId: Map<string, UnitLookup>;
    byName: Map<string, UnitLookup>;
    byExternalId: Map<string, UnitLookup>;
  },
): NormalizedImportRow {
  const rawUnitId = optionalString(resolveMappedValue(row, mapping, "unitId"));
  const rawUnitName = optionalString(resolveMappedValue(row, mapping, "unitName"));
  const rawExternalUnitId = optionalString(resolveMappedValue(row, mapping, "externalUnitId"));
  const resolvedUnit = resolveUnit(rawUnitId, rawUnitName, rawExternalUnitId, lookups);
  const normalizedValueType = normalizeValueType(resolveMappedValue(row, mapping, "valueType"));

  return {
    rowNumber: rowIndex,
    date: normalizeDate(resolveMappedValue(row, mapping, "date")),
    country: optionalString(resolveMappedValue(row, mapping, "country")) ?? resolvedUnit?.country ?? "",
    region: optionalString(resolveMappedValue(row, mapping, "region")) ?? resolvedUnit?.region ?? null,
    unitId: resolvedUnit?.id ?? rawUnitId,
    unitName: resolvedUnit?.name ?? rawUnitName,
    unitExternalId: resolvedUnit?.externalId ?? rawExternalUnitId,
    metricKey: cleanString(resolveMappedValue(row, mapping, "metricKey")).toLowerCase(),
    article: optionalString(resolveMappedValue(row, mapping, "article")),
    valueType: normalizedValueType as AnalyticsValueType,
    value: normalizeNumber(resolveMappedValue(row, mapping, "value")),
    currency: optionalString(resolveMappedValue(row, mapping, "currency")),
    sourceType,
    raw: row,
  };
}

export async function previewImportRows(input: ImportPreviewRowsInput): Promise<ImportPreviewRowsResult> {
  if (!importSourceTypes.includes(input.sourceType as ImportSourceType)) {
    throw new ImportPreviewInputError("invalid_source_type", "Unsupported source type", 400, {
      sourceType: input.sourceType,
      supportedSourceTypes: importSourceTypes,
    });
  }

  if (!Array.isArray(input.rows)) {
    throw new ImportPreviewInputError("invalid_rows", "Rows must be an array", 400);
  }

  if (input.rows.length > IMPORT_PREVIEW_MAX_ROWS) {
    throw new ImportPreviewInputError("preview_rows_limit_exceeded", "Preview row limit exceeded", 400, {
      maxRows: IMPORT_PREVIEW_MAX_ROWS,
      receivedRows: input.rows.length,
    });
  }

  if (input.rows.length === 0) return buildEmptyResult();

  const sourceType = input.sourceType as ImportSourceType;
  const [units, metrics] = await Promise.all([
    db.unit.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        externalId: true,
      },
    }),
    db.metricArticle.findMany({
      where: { active: true },
      select: {
        code: true,
      },
    }),
  ]);

  const unitLookups = {
    byId: new Map(units.map((unit) => [unit.id, unit])),
    byName: new Map(units.map((unit) => [unit.name.trim().toLowerCase(), unit])),
    byExternalId: new Map(
      units
        .filter((unit) => unit.externalId)
        .map((unit) => [String(unit.externalId).trim().toLowerCase(), unit]),
    ),
  };

  const normalizedRows = input.rows.map((row, index) =>
    toNormalizedPreviewRow(row, index + 1, sourceType, input.mapping, unitLookups),
  );

  const validation = validateImportRows(normalizedRows, {
    strictMetricDefinitions: input.options?.strictMetrics ?? true,
    allowUnknownMetrics: false,
    allowUnknownUnits: input.options?.strictUnits === false,
    knownMetricKeys: metrics.map((metric) => metric.code),
    knownUnitIds: units.map((unit) => unit.id),
    knownUnitNames: units.map((unit) => unit.name),
    knownUnitExternalIds: units.flatMap((unit) => (unit.externalId ? [unit.externalId] : [])),
  });

  const issuesByRow = new Map<number, ImportPreviewIssue[]>();
  const allIssues = [...validation.errors, ...validation.warnings]
    .map((issue) => buildIssue(issue.rowNumber, issue.message, issue.severity, issue.field))
    .sort((left, right) => left.rowIndex - right.rowIndex);

  for (const issue of allIssues) {
    const rowIssues = issuesByRow.get(issue.rowIndex) ?? [];
    rowIssues.push(issue);
    issuesByRow.set(issue.rowIndex, rowIssues);
  }

  const rowsPreview = normalizedRows.map((row) => {
    const rowIssues = issuesByRow.get(row.rowNumber) ?? [];
    return {
      rowIndex: row.rowNumber,
      status: buildRowStatus(rowIssues),
      normalized: toPreviewNormalized(row),
      raw: row.raw,
      errors: rowIssues,
    };
  });

  const summary = rowsPreview.reduce<ImportPreviewRowsResult["summary"]>(
    (accumulator, row) => {
      accumulator.totalRows += 1;
      if (row.status === "valid") accumulator.validRows += 1;
      if (row.status === "warning") accumulator.warningRows += 1;
      if (row.status === "invalid") accumulator.invalidRows += 1;
      accumulator.errorsCount += row.errors.filter((issue) => issue.severity === "error").length;
      return accumulator;
    },
    {
      totalRows: 0,
      validRows: 0,
      warningRows: 0,
      invalidRows: 0,
      errorsCount: 0,
    },
  );

  return {
    rowsPreview,
    errors: allIssues,
    summary,
    meta: {
      generatedAt: new Date().toISOString(),
      source: "import_preview",
      persisted: false,
    },
  };
}
