export type DodoApiConfig = {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  organizationId?: string;
  timeoutMs?: number;
};

export type DodoMetricKey =
  | "revenue"
  | "orders"
  | "delivery_sales"
  | "delivery_time"
  | "dc"
  | "stops"
  | "production_time"
  | "labor"
  | "write_offs"
  | "uc";

export type DodoSyncOptions = {
  country?: string;
  units?: string[];
  from: string;
  to: string;
  metrics: DodoMetricKey[];
  dryRun?: boolean;
};

export type DodoRawMetric = {
  externalUnitId: string;
  unitName?: string;
  date: string;
  metricKey: DodoMetricKey;
  value: number;
  currency?: string;
  raw: Record<string, unknown>;
};

export type DodoSyncError = {
  code: string;
  message: string;
  externalUnitId?: string;
  raw?: Record<string, unknown>;
};

export type DodoSyncResult = {
  status: "ok" | "error" | "not_configured" | "dry_run";
  rowsFetched: number;
  rowsMapped: number;
  rowsFailed: number;
  importBatchId?: string;
  errors: DodoSyncError[];
  startedAt: string;
  finishedAt?: string;
};
