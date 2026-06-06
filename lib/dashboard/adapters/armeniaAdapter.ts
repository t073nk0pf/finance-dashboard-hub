import type { PlanFactResult } from "@/lib/analytics/types";
import type { ForecastResult } from "@/lib/forecast/types";
import type { ArmeniaDashboardData } from "@/types/armenia";

type ArmeniaAdapterInput = {
  fallback: ArmeniaDashboardData;
  planFact?: PlanFactResult | null;
  forecast?: ForecastResult | null;
};

function sumByMetric(planFact: PlanFactResult | null | undefined, metricKey: string): number {
  if (!planFact?.rows?.length) return 0;
  return planFact.rows
    .filter((row) => row.metricKey === metricKey)
    .reduce((accumulator, row) => accumulator + row.factValue, 0);
}

function getBaseScenarioValue(forecast: ForecastResult | null | undefined, metricKey: string): number | null {
  if (!forecast?.rows?.length) return null;
  const row = forecast.rows.find((item) => item.metricKey === metricKey && item.scenario === "base");
  return row ? row.forecastTotal : null;
}

export function adaptArmeniaDashboardData(input: ArmeniaAdapterInput): ArmeniaDashboardData {
  const { fallback, planFact, forecast } = input;
  if (!planFact?.rows?.length) return fallback;

  const revenueFact = sumByMetric(planFact, "revenue");
  const ebitdaFact = sumByMetric(planFact, "ebitda");
  const ucFact = sumByMetric(planFact, "uc");
  const dcFact = sumByMetric(planFact, "dc");

  const revenue = revenueFact > 0 ? revenueFact : fallback.kpis.revenue;
  const ebitda = Number.isFinite(ebitdaFact) && ebitdaFact !== 0 ? ebitdaFact : fallback.kpis.ebitda;
  const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : fallback.kpis.ebitdaMargin;

  const forecastRevenue = getBaseScenarioValue(forecast, "revenue");
  const forecastEbitda = getBaseScenarioValue(forecast, "ebitda");

  const profitabilityDrivers = [...fallback.profitabilityDrivers];
  if (forecastRevenue !== null) {
    profitabilityDrivers.unshift({
      title: "Forecast выручки",
      value: `${Math.round(forecastRevenue).toLocaleString("ru-RU")}`,
      description: "Базовый сценарий из analytics forecast engine.",
      tone: forecastRevenue >= revenue ? "positive" : "warning",
    });
  }
  if (forecastEbitda !== null) {
    profitabilityDrivers.unshift({
      title: "Forecast EBITDA",
      value: `${Math.round(forecastEbitda).toLocaleString("ru-RU")}`,
      description: "Базовый сценарий из analytics forecast engine.",
      tone: forecastEbitda >= ebitda ? "positive" : "warning",
    });
  }

  return {
    ...fallback,
    kpis: {
      ...fallback.kpis,
      revenue,
      ebitda,
      ebitdaMargin,
      ucShare: ucFact !== 0 ? ucFact : fallback.kpis.ucShare,
      opexShare: dcFact !== 0 ? dcFact : fallback.kpis.opexShare,
      averageRevenuePerRestaurant:
        fallback.kpis.restaurants > 0 ? revenue / fallback.kpis.restaurants : fallback.kpis.averageRevenuePerRestaurant,
    },
    profitabilityDrivers: profitabilityDrivers.slice(0, Math.max(fallback.profitabilityDrivers.length, 4)),
  };
}
