import { NotImplementedError } from "@/lib/analytics/model";
import type { ForecastInput, ForecastResult } from "@/lib/forecast/types";

export type ForecastEngine = {
  run(input: ForecastInput): Promise<ForecastResult>;
};

export function createNotImplementedForecastEngine(): ForecastEngine {
  return {
    async run() {
      throw new NotImplementedError("Forecast engine is not implemented yet");
    },
  };
}
