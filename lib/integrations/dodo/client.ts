import { NotImplementedError } from "@/lib/analytics/model";
import type { DodoApiConfig, DodoMetricRecord, DodoUnit } from "@/lib/integrations/dodo/types";

export type DodoClient = {
  listUnits(): Promise<DodoUnit[]>;
  fetchMetricRecords(params: { from: string; to: string; unitIds?: string[] }): Promise<DodoMetricRecord[]>;
};

export function createDodoClient(_config: DodoApiConfig): DodoClient {
  return {
    async listUnits() {
      throw new NotImplementedError("Dodo API client is not implemented yet");
    },
    async fetchMetricRecords() {
      throw new NotImplementedError("Dodo API metric fetch is not implemented yet");
    },
  };
}
