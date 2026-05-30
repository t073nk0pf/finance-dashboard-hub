export type DodoApiConfig = {
  baseUrl: string;
  apiKey?: string;
  businessId?: string;
};

export type DodoSyncOptions = {
  from: string;
  to: string;
  unitIds?: string[];
  metricKeys?: string[];
};

export type DodoUnit = {
  id: string;
  name: string;
  country: string;
  region?: string;
};

export type DodoMetricRecord = {
  date: string;
  unitId: string;
  metricKey: string;
  value: number;
};

export type DodoRawMetric = DodoMetricRecord & {
  currency?: string;
  sourcePayload?: Record<string, unknown>;
};

export type DodoSyncResult = {
  rowsFetched: number;
  rowsMapped: number;
  errors: string[];
};
