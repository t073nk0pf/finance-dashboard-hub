export type AnalyticsValueType = "fact" | "plan" | "forecast" | "business_plan";
export type ValueType = AnalyticsValueType;
export type SourceType = "manual" | "excel" | "csv" | "google_sheets" | "dodo_api" | "seed";
export type MetricDirection = "higher_is_better" | "lower_is_better" | "neutral";
export type MetricFormat = "money" | "percent" | "number" | "pp" | "ratio";
export type DataSourceStatus = "active" | "inactive" | "error";

export class NotImplementedError extends Error {
  constructor(message = "Not implemented yet") {
    super(message);
    this.name = "NotImplementedError";
  }
}

export type DateRange = {
  from: string;
  to: string;
};

export type Scope = {
  country: string;
  region?: string | null;
  unitId?: string | null;
};

export type Unit = {
  id: string;
  name: string;
  country: string;
  region?: string | null;
  externalId?: string | null;
  isActive: boolean;
};

export type MetricDefinition = {
  id?: string;
  key: string;
  name: string;
  category: string;
  article?: string | null;
  unitType: string;
  direction: MetricDirection;
  format: MetricFormat;
  isActive: boolean;
};

export type AnalyticsFact = {
  id?: string;
  date: string;
  country: string;
  region?: string | null;
  unitId?: string | null;
  metricKey: string;
  article?: string | null;
  valueType: AnalyticsValueType;
  value: number;
  currency?: string | null;
  sourceType: SourceType;
  sourceId?: string | null;
  importBatchId?: string | null;
};

export const baseMetricDefinitions: MetricDefinition[] = [
  { key: "revenue", name: "Выручка", category: "financial", article: "revenue", unitType: "money", direction: "higher_is_better", format: "money", isActive: true },
  { key: "ebitda", name: "EBITDA", category: "financial", article: "ebitda", unitType: "money", direction: "higher_is_better", format: "money", isActive: true },
  { key: "uc", name: "UC", category: "cost", article: "uc", unitType: "share", direction: "lower_is_better", format: "percent", isActive: true },
  { key: "dc", name: "DC", category: "cost", article: "dc", unitType: "share", direction: "lower_is_better", format: "percent", isActive: true },
  { key: "labor", name: "Фонд оплаты труда", category: "cost", article: "labor", unitType: "share", direction: "lower_is_better", format: "percent", isActive: true },
  { key: "rent", name: "Аренда", category: "cost", article: "rent", unitType: "share", direction: "lower_is_better", format: "percent", isActive: true },
  { key: "marketing", name: "Маркетинг", category: "cost", article: "marketing", unitType: "share", direction: "lower_is_better", format: "percent", isActive: true },
  { key: "utilities", name: "Коммунальные услуги", category: "cost", article: "utilities", unitType: "share", direction: "lower_is_better", format: "percent", isActive: true },
  { key: "write_offs", name: "Списания", category: "cost", article: "write_offs", unitType: "share", direction: "lower_is_better", format: "percent", isActive: true },
  { key: "other_expenses", name: "Прочие расходы", category: "cost", article: "other_expenses", unitType: "share", direction: "lower_is_better", format: "percent", isActive: true },
];
