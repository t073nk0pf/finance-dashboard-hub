import { calculatePlanFactStatus } from "../lib/analytics/status.ts";
import { isPositiveVariance } from "../lib/analytics/direction.ts";
import { runForecast } from "../lib/forecast/engine.ts";
import { calculateForecastStatus } from "../lib/forecast/status.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCase(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

runCase("higher_is_better plan-fact status", () => {
  const normal = calculatePlanFactStatus({
    planValue: 100,
    factValue: 102,
    varianceValue: 2,
    variancePercent: 2,
    completionPercent: 102,
    direction: "higher_is_better",
  });
  const risk = calculatePlanFactStatus({
    planValue: 100,
    factValue: 90,
    varianceValue: -10,
    variancePercent: -10,
    completionPercent: 90,
    direction: "higher_is_better",
  });
  assert(normal === "normal", "higher_is_better normal mismatch");
  assert(risk === "risk", "higher_is_better risk mismatch");
});

runCase("lower_is_better plan-fact status", () => {
  const normal = calculatePlanFactStatus({
    planValue: 100,
    factValue: 95,
    varianceValue: -5,
    variancePercent: -5,
    completionPercent: 95,
    direction: "lower_is_better",
  });
  const critical = calculatePlanFactStatus({
    planValue: 100,
    factValue: 120,
    varianceValue: 20,
    variancePercent: 20,
    completionPercent: 120,
    direction: "lower_is_better",
  });
  assert(normal === "normal", "lower_is_better normal mismatch");
  assert(critical === "critical", "lower_is_better critical mismatch");
});

runCase("no_data when plan missing", () => {
  const status = calculatePlanFactStatus({
    planValue: 0,
    factValue: 100,
    varianceValue: 100,
    variancePercent: null,
    completionPercent: null,
    direction: "higher_is_better",
  });
  assert(status === "no_data", "missing plan should be no_data");
});

runCase("direction positive variance helper", () => {
  assert(isPositiveVariance("higher_is_better", 100, 120), "higher_is_better positive mismatch");
  assert(!isPositiveVariance("lower_is_better", 100, 120), "lower_is_better positive mismatch");
});

runCase("forecast scenarios relation and base current pace", () => {
  const input = {
    filters: {
      country: "armenia",
      region: "all",
      unitId: undefined,
      dateRange: { from: "2026-05-01", to: "2026-05-31" },
      aggregationMode: "period",
      compareMode: "plan",
      valueTypes: ["fact", "plan"],
    },
    metrics: ["revenue"],
    scenarios: ["pessimistic", "base", "optimistic"],
    asOfDate: "2026-05-17",
    method: "current_pace",
  };

  const facts = [
    { metricKey: "revenue", valueType: "fact", date: "2026-05-01", value: 100, country: "armenia", sourceType: "seed" },
    { metricKey: "revenue", valueType: "fact", date: "2026-05-17", value: 100, country: "armenia", sourceType: "seed" },
    { metricKey: "revenue", valueType: "plan", date: "2026-05-01", value: 400, country: "armenia", sourceType: "seed" },
    { metricKey: "revenue", valueType: "plan", date: "2026-05-31", value: 400, country: "armenia", sourceType: "seed" },
  ];

  const metricDefinitions = [{ key: "revenue", name: "Revenue", direction: "higher_is_better" }];

  const result = runForecast(input, facts, metricDefinitions);
  const pessimistic = result.rows.find((row) => row.scenario === "pessimistic");
  const base = result.rows.find((row) => row.scenario === "base");
  const optimistic = result.rows.find((row) => row.scenario === "optimistic");

  assert(!!pessimistic && !!base && !!optimistic, "all scenarios must exist");
  assert(pessimistic.forecastTotal < base.forecastTotal, "pessimistic must be below base");
  assert(optimistic.forecastTotal > base.forecastTotal, "optimistic must be above base");
});

runCase("forecast status lower_is_better", () => {
  const status = calculateForecastStatus({
    actualValue: 100,
    planValue: 100,
    forecastValue: 108,
    direction: "lower_is_better",
  });
  assert(status === "risk", "expected risk for +8% over plan");
});

if (process.exitCode && process.exitCode !== 0) {
  console.error("Analytics calculations contract checks failed.");
  process.exit(process.exitCode);
}

console.log("Analytics calculations contract checks passed.");
