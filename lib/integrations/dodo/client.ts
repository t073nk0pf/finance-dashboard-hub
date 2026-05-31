import type { DodoApiConfig, DodoRawMetric, DodoSyncOptions } from "@/lib/integrations/dodo/types";

export class DodoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DodoConfigError";
  }
}

export class DodoNotImplementedError extends Error {
  constructor(message = "Dodo live fetch is not implemented yet") {
    super(message);
    this.name = "DodoNotImplementedError";
  }
}

export type DodoApiClient = {
  config: DodoApiConfig;
  fetchMetrics(options: DodoSyncOptions): Promise<DodoRawMetric[]>;
  refreshToken(): Promise<{ accessToken: string; refreshToken?: string }>;
};

function assertConfig(config: DodoApiConfig): void {
  if (!config.baseUrl) throw new DodoConfigError("DODO_API_BASE_URL is not configured");
}

export function createDodoClient(config: DodoApiConfig): DodoApiClient {
  assertConfig(config);

  return {
    config,
    async fetchMetrics(options) {
      return fetchDodoMetrics(this, options);
    },
    async refreshToken() {
      return refreshDodoToken(this);
    },
  };
}

export async function fetchDodoMetrics(client: DodoApiClient, options: DodoSyncOptions): Promise<DodoRawMetric[]> {
  if (!client.config.baseUrl) throw new DodoConfigError("DODO_API_BASE_URL is not configured");
  if (!options.from || !options.to) throw new DodoConfigError("Dodo sync period is not configured");
  if (!options.metrics.length) throw new DodoConfigError("Dodo sync metrics are not configured");
  throw new DodoNotImplementedError();
}

export async function refreshDodoToken(client: DodoApiClient): Promise<{ accessToken: string; refreshToken?: string }> {
  if (!client.config.baseUrl) throw new DodoConfigError("DODO_API_BASE_URL is not configured");
  throw new DodoNotImplementedError("Dodo token refresh is not implemented yet");
}
