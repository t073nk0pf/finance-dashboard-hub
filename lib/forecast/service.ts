import { normalizeDashboardFilters } from "@/lib/analytics/filters";
import { createPrismaAnalyticsRepository } from "@/lib/analytics/repository";
import { runForecast } from "@/lib/forecast/engine";
import type { ForecastInput, ForecastResult } from "@/lib/forecast/types";

export async function getForecastInput(input: ForecastInput): Promise<{
  input: ForecastInput;
  facts: Awaited<ReturnType<ReturnType<typeof createPrismaAnalyticsRepository>["findFacts"]>>;
  metricDefinitions: Awaited<ReturnType<ReturnType<typeof createPrismaAnalyticsRepository>["listMetricDefinitions"]>>;
}> {
  const repository = createPrismaAnalyticsRepository();
  const filters = normalizeDashboardFilters({
    ...input.filters,
    valueTypes: ["fact", "plan"],
  });

  const facts = await repository.findFacts(filters);
  const metricDefinitions = await repository.listMetricDefinitions();

  return {
    input: {
      ...input,
      filters,
    },
    facts,
    metricDefinitions,
  };
}

export async function runForecastForFilters(input: ForecastInput): Promise<ForecastResult> {
  const data = await getForecastInput(input);
  return runForecast(data.input, data.facts, data.metricDefinitions);
}

export async function getForecastMetrics(input: ForecastInput): Promise<string[]> {
  const data = await getForecastInput(input);
  const metrics = input.metrics?.length ? input.metrics : data.metricDefinitions.map((definition) => definition.key);
  return metrics;
}
