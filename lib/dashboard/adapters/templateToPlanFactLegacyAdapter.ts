import type { ComposedDashboardData } from "@/lib/dashboard/template/composer";
import type { DashboardPlanFactApiResponse } from "@/lib/dashboard/types";

export type TemplateToPlanFactLegacyAdapterInput = {
  composedData: ComposedDashboardData | null | undefined;
  fallbackDashboardData: DashboardPlanFactApiResponse;
};

export type TemplateToPlanFactLegacyAdapterResult = {
  data: DashboardPlanFactApiResponse;
  hasData: boolean;
};

export function hasPlanFactLegacyShape(value: unknown): value is DashboardPlanFactApiResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.months) &&
    candidate.metrics !== null &&
    typeof candidate.metrics === "object" &&
    Array.isArray(candidate.mainArticles) &&
    candidate.expenseVariance !== null &&
    typeof candidate.expenseVariance === "object" &&
    Array.isArray(candidate.entities)
  );
}

export function adaptTemplateToPlanFactLegacyResponse(
  input: TemplateToPlanFactLegacyAdapterInput,
): TemplateToPlanFactLegacyAdapterResult {
  const { composedData, fallbackDashboardData } = input;
  if (!composedData || typeof composedData !== "object") {
    return { data: fallbackDashboardData, hasData: false };
  }

  const planFactSection = composedData.sections?.plan_fact;
  const articleSection = composedData.sections?.article_performance;
  const unitSection = composedData.sections?.unit_performance;

  if (!planFactSection || typeof planFactSection !== "object") {
    return { data: fallbackDashboardData, hasData: false };
  }

  const months = (planFactSection as { months?: unknown }).months;
  const metrics = (planFactSection as { metrics?: unknown }).metrics;
  const mainArticles = (planFactSection as { mainArticles?: unknown }).mainArticles;
  const better = (articleSection as { better?: unknown } | undefined)?.better ?? fallbackDashboardData.expenseVariance.better;
  const worse = (articleSection as { worse?: unknown } | undefined)?.worse ?? fallbackDashboardData.expenseVariance.worse;
  const entities = (unitSection as { entities?: unknown } | undefined)?.entities ?? fallbackDashboardData.entities;

  if (!Array.isArray(months) || !metrics || typeof metrics !== "object" || !Array.isArray(mainArticles)) {
    return { data: fallbackDashboardData, hasData: false };
  }

  const typedMetrics = metrics as DashboardPlanFactApiResponse["metrics"];
  const typedMainArticles = mainArticles as DashboardPlanFactApiResponse["mainArticles"];
  const typedEntities = (Array.isArray(entities) ? entities : fallbackDashboardData.entities) as DashboardPlanFactApiResponse["entities"];

  const maybeData = {
    ...fallbackDashboardData,
    months,
    metrics: typedMetrics,
    mainArticles: typedMainArticles,
    expenseVariance: {
      better: Array.isArray(better) ? better : fallbackDashboardData.expenseVariance.better,
      worse: Array.isArray(worse) ? worse : fallbackDashboardData.expenseVariance.worse,
    },
    entities: typedEntities,
  } satisfies DashboardPlanFactApiResponse;

  if (!hasPlanFactLegacyShape(maybeData)) {
    return { data: fallbackDashboardData, hasData: false };
  }

  return {
    data: maybeData,
    hasData: true,
  };
}
