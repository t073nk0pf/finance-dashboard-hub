import type { AnalyticsFact, MetricDefinition } from "@/lib/analytics/model";
import { getMetricDirection } from "@/lib/analytics/direction";
import { calculateForecastStatus } from "@/lib/forecast/status";
import type {
  ForecastInput,
  ForecastMethod,
  ForecastMetricContext,
  ForecastMetricResult,
  ForecastResult,
  ForecastScenario,
} from "@/lib/forecast/types";

const defaultScenarios: ForecastScenario[] = ["pessimistic", "base", "optimistic"];

function scenarioMultiplier(scenario: ForecastScenario): number {
  if (scenario === "pessimistic") return 0.95;
  if (scenario === "optimistic") return 1.05;
  return 1;
}

function inRange(dateIso: string, fromIso: string, toIso: string): boolean {
  const value = new Date(dateIso).getTime();
  return value >= new Date(fromIso).getTime() && value <= new Date(toIso).getTime();
}

function sumFacts(
  facts: AnalyticsFact[],
  metricKey: string,
  valueType: AnalyticsFact["valueType"],
  fromIso: string,
  toIso: string,
): number {
  return facts
    .filter((fact) => fact.metricKey === metricKey && fact.valueType === valueType && inRange(fact.date, fromIso, toIso))
    .reduce((accumulator, fact) => accumulator + fact.value, 0);
}

function daysDiffInclusive(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

function buildContext(
  metric: MetricDefinition,
  facts: AnalyticsFact[],
  input: ForecastInput,
  asOfDate: string,
): ForecastMetricContext {
  const from = input.filters.dateRange.from;
  const to = input.filters.dateRange.to;
  const cappedAsOf = new Date(Math.min(new Date(asOfDate).getTime(), new Date(to).getTime())).toISOString();

  const totalDays = daysDiffInclusive(from, to);
  const elapsedDays = daysDiffInclusive(from, cappedAsOf);
  const remainingDays = Math.max(totalDays - elapsedDays, 0);

  return {
    metricKey: metric.key,
    metricName: metric.name,
    direction: getMetricDirection(metric),
    actualToDate: sumFacts(facts, metric.key, "fact", from, cappedAsOf),
    planToDate: sumFacts(facts, metric.key, "plan", from, cappedAsOf),
    planTotal: sumFacts(facts, metric.key, "plan", from, to),
    elapsedDays,
    totalDays,
    remainingDays,
  };
}

export function calculateScenarioValue(baseValue: number, scenario: ForecastScenario): number {
  return baseValue * scenarioMultiplier(scenario);
}

export function calculateCurrentPaceForecast(
  context: ForecastMetricContext,
  scenario: ForecastScenario,
  method: ForecastMethod,
): ForecastMetricResult {
  const averagePerDay = context.elapsedDays > 0 ? context.actualToDate / context.elapsedDays : 0;
  const baseRemaining = averagePerDay * context.remainingDays;
  const forecastRemaining = calculateScenarioValue(baseRemaining, scenario);
  const forecastTotal = context.actualToDate + forecastRemaining;

  const varianceToPlan =
    typeof context.planTotal === "number" && Number.isFinite(context.planTotal) ? forecastTotal - context.planTotal : undefined;
  const varianceToPlanPercent =
    varianceToPlan !== undefined && context.planTotal && context.planTotal !== 0
      ? (varianceToPlan / context.planTotal) * 100
      : undefined;

  return {
    metricKey: context.metricKey,
    metricName: context.metricName,
    scenario,
    method,
    actualToDate: context.actualToDate,
    planToDate: context.planToDate,
    forecastRemaining,
    forecastTotal,
    planTotal: context.planTotal,
    varianceToPlan,
    varianceToPlanPercent,
    status: calculateForecastStatus({
      actualValue: context.actualToDate,
      planValue: context.planTotal,
      forecastValue: forecastTotal,
      direction: context.direction,
    }),
    confidence: scenario === "base" ? 0.7 : 0.5,
    meta: {
      elapsedDays: context.elapsedDays,
      totalDays: context.totalDays,
      remainingDays: context.remainingDays,
      averagePerDay,
    },
  };
}

export function buildForecastScenarios(input: ForecastInput): ForecastScenario[] {
  if (!input.scenarios?.length) return defaultScenarios;
  return input.scenarios.filter((scenario, index, array) => array.indexOf(scenario) === index);
}

export function runForecast(
  input: ForecastInput,
  facts: AnalyticsFact[],
  metricDefinitions: MetricDefinition[],
): ForecastResult {
  const scenarios = buildForecastScenarios(input);
  const method: ForecastMethod = input.method ?? "current_pace";
  const asOfDate = input.asOfDate ?? input.filters.dateRange.to;

  const metrics = input.metrics?.length
    ? metricDefinitions.filter((metricDefinition) => input.metrics?.includes(metricDefinition.key))
    : metricDefinitions;

  const rows = metrics.flatMap((metric) => {
    const context = buildContext(metric, facts, input, asOfDate);
    return scenarios.map((scenario) => calculateCurrentPaceForecast(context, scenario, method));
  });

  const generatedAt = new Date().toISOString();
  const metricSet = new Set(rows.map((row) => row.metricKey));

  return {
    filters: input.filters,
    asOfDate,
    period: {
      from: input.filters.dateRange.from,
      to: input.filters.dateRange.to,
    },
    scenarios,
    rows,
    summary: {
      rowsTotal: rows.length,
      metricsCount: metricSet.size,
      scenariosCount: scenarios.length,
      hasPlanComparison: rows.some((row) => typeof row.planTotal === "number"),
      generatedAt,
    },
    generatedAt,
  };
}
