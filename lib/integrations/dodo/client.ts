import { NotImplementedError } from "@/lib/analytics/model";
import type {
  DodoApiConfig,
  DodoMetricRecord,
  DodoSyncOptions,
  DodoSyncResult,
  DodoUnit,
} from "@/lib/integrations/dodo/types";

export type DodoApiClient = {
  listUnits(): Promise<DodoUnit[]>;
  fetchMetricRecords(params: { from: string; to: string; unitIds?: string[] }): Promise<DodoMetricRecord[]>;
  syncDodoMetrics(options: DodoSyncOptions): Promise<DodoSyncResult>;
};

export function createDodoClient(config?: DodoApiConfig): DodoApiClient {
  void config;

  return {
    async listUnits() {
      throw new NotImplementedError("Dodo API client is not implemented yet");
    },
    async fetchMetricRecords() {
      throw new NotImplementedError("Dodo API metric fetch is not implemented yet");
    },
    async syncDodoMetrics() {
      throw new NotImplementedError("Dodo API sync is not implemented yet");
    },
  };
}

export async function syncDodoMetrics(
  client: DodoApiClient,
  options: DodoSyncOptions,
): Promise<DodoSyncResult> {
  return client.syncDodoMetrics(options);
}
