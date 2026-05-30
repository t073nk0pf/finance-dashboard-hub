export type DodoApiConfig = {
  baseUrl: string;
  apiKey: string;
  businessId?: string;
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
