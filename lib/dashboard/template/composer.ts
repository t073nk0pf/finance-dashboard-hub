import type { DashboardFilters } from "@/lib/analytics/filters";
import { calculatePlanFact } from "@/lib/analytics/planFact";
import type { PlanFactInput } from "@/lib/analytics/types";
import { adaptForecastToDashboardResponse, buildForecastFallbackResponse } from "@/lib/dashboard/adapters/forecastAdapter";
import { adaptPlanFactToDashboardData } from "@/lib/dashboard/adapters/planFactAdapter";
import type { DashboardTemplateConfig, DashboardSectionConfig } from "@/lib/dashboard/template/types";
import type { DashboardSectionData, ExecutiveSummarySectionData } from "@/lib/dashboard/template/sections";
import { getPlanFactDashboardData } from "@/lib/data/dashboardDataService";
import { runForecastForFilters } from "@/lib/forecast/service";
import type { ForecastInput } from "@/lib/forecast/types";
import type { DashboardData } from "@/types/dashboard";

export type ComposedDashboardData = {
  templateId: string;
  title: string;
  scope: DashboardTemplateConfig["scope"];
  filters: DashboardFilters;
  sections: Record<string, DashboardSectionData>;
  generatedAt: string;
};

export type DashboardCompositionContext = {
  getPlanFactFallback: () => Promise<DashboardData>;
};

export function createDashboardCompositionContext(): DashboardCompositionContext {
  let planFactFallbackPromise: Promise<DashboardData> | null = null;

  return {
    getPlanFactFallback: () => {
      planFactFallbackPromise ??= getPlanFactDashboardData({ source: "static-json" });
      return planFactFallbackPromise;
    },
  };
}

export async function composeExecutiveSummary(filters: DashboardFilters): Promise<ExecutiveSummarySectionData> {
  const result = await calculatePlanFact({
    filters,
    groupBy: "metric",
  });

  const kpis = result.rows.slice(0, 5).map((row) => ({
    key: row.metricKey,
    title: row.metricName ?? row.metricKey,
    plan: row.planValue,
    fact: row.factValue,
    delta: row.varianceValue,
    status: row.status,
  }));

  return {
    kpis,
  };
}

export async function composePlanFactSection(
  filters: DashboardFilters,
  context: DashboardCompositionContext = createDashboardCompositionContext(),
): Promise<DashboardSectionData> {
  const fallback = await context.getPlanFactFallback();
  const input: PlanFactInput = {
    filters: {
      ...filters,
      valueTypes: filters.valueTypes.includes("business_plan")
        ? filters.valueTypes
        : [...filters.valueTypes, "business_plan"],
    },
    groupBy: "metric",
  };
  const result = await calculatePlanFact(input);
  const patched = result.rows.length ? adaptPlanFactToDashboardData(fallback, result) : fallback;

  return {
    months: patched.months,
    metrics: patched.metrics,
    mainArticles: patched.mainArticles,
  };
}

export async function composeForecastSection(filters: DashboardFilters): Promise<DashboardSectionData> {
  const input: ForecastInput = {
    filters: {
      ...filters,
      valueTypes: filters.valueTypes.filter((valueType) => valueType === "fact" || valueType === "plan"),
    },
    method: "current_pace",
  };
  const result = await runForecastForFilters(input);
  if (!result.rows.length) return buildForecastFallbackResponse();
  return adaptForecastToDashboardResponse(result);
}

export async function composeUnitPerformanceSection(
  filters: DashboardFilters,
  context: DashboardCompositionContext = createDashboardCompositionContext(),
): Promise<DashboardSectionData> {
  const fallback = await context.getPlanFactFallback();
  void filters;
  return {
    entities: fallback.entities,
  };
}

export async function composeSectionData(
  section: DashboardSectionConfig,
  filters: DashboardFilters,
  context: DashboardCompositionContext = createDashboardCompositionContext(),
): Promise<DashboardSectionData> {
  switch (section.key) {
    case "executive_summary":
      return composeExecutiveSummary(filters);
    case "plan_fact":
      return composePlanFactSection(filters, context);
    case "forecast":
      return composeForecastSection(filters);
    case "unit_performance":
      return composeUnitPerformanceSection(filters, context);
    case "article_performance": {
      const fallback = await context.getPlanFactFallback();
      return {
        better: fallback.expenseVariance.better,
        worse: fallback.expenseVariance.worse,
      };
    }
    case "current_results": {
      const fallback = await context.getPlanFactFallback();
      return {
        metrics: Object.values(fallback.metrics),
        period: {
          from: filters.dateRange.from,
          to: filters.dateRange.to,
        },
      };
    }
    case "table_layer": {
      const fallback = await context.getPlanFactFallback();
      return {
        rows: fallback.entities as unknown as Array<Record<string, unknown>>,
      };
    }
    case "tv_summary": {
      const summary = await composeExecutiveSummary(filters);
      return summary;
    }
    default:
      return { rows: [] };
  }
}

export async function composeDashboardData(
  config: DashboardTemplateConfig,
  filters: DashboardFilters = config.defaultFilters,
  context: DashboardCompositionContext = createDashboardCompositionContext(),
): Promise<ComposedDashboardData> {
  const sections = config.sections
    .filter((section) => section.enabled)
    .sort((left, right) => left.order - right.order);

  const data: Record<string, DashboardSectionData> = {};
  for (const section of sections) {
    data[section.key] = await composeSectionData(section, filters, context);
  }

  return {
    templateId: config.id,
    title: config.title,
    scope: config.scope,
    filters,
    sections: data,
    generatedAt: new Date().toISOString(),
  };
}
