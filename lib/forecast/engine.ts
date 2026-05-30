import { NotImplementedError } from "@/lib/analytics/model";
import type { ForecastInput, ForecastResult, ForecastScenario } from "@/lib/forecast/types";

export type ForecastEngine = {
  runForecast(input: ForecastInput): Promise<ForecastResult[]>;
  buildForecastScenarios(input: ForecastInput): Promise<ForecastScenario[]>;
};

export function createNotImplementedForecastEngine(): ForecastEngine {
  return {
    async runForecast() {
      throw new NotImplementedError("Forecast engine is not implemented yet");
    },
    async buildForecastScenarios() {
      throw new NotImplementedError("Forecast scenarios are not implemented yet");
    },
  };
}

export async function runForecast(input: ForecastInput): Promise<ForecastResult[]> {
  void input;
  throw new NotImplementedError("Forecast engine is not implemented yet");
}

export async function buildForecastScenarios(input: ForecastInput): Promise<ForecastScenario[]> {
  void input;
  throw new NotImplementedError("Forecast scenarios are not implemented yet");
}
