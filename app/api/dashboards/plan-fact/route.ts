import { NextRequest, NextResponse } from "next/server";
import { calculatePlanFact } from "@/lib/analytics/planFact";
import { adaptPlanFactToDashboardData } from "@/lib/dashboard/adapters/planFactAdapter";
import { adaptTemplateToPlanFactLegacyResponse } from "@/lib/dashboard/adapters/templateToPlanFactLegacyAdapter";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { composeDashboardData } from "@/lib/dashboard/template/composer";
import { getDashboardTemplate } from "@/lib/dashboard/template/registry";
import { runDashboardTemplateRoutePipeline } from "@/lib/dashboard/template/routeOrchestrator";
import { DashboardDataNotFoundError, getPlanFactDashboardData } from "@/lib/data/dashboardDataService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const fallback = await getPlanFactDashboardData({ source: "static-json" });
    const parsed = parseDashboardQueryParams(request.nextUrl.searchParams);
    if (parsed.warnings.length) {
      logDashboardFallback("invalid_query_params", {
        route: "/api/dashboards/plan-fact",
        params: { warnings: parsed.warnings },
      });
    }
    const result = await runDashboardTemplateRoutePipeline({
      routeName: "/api/dashboards/plan-fact",
      legacyFallbackData: fallback,
      runTemplate: async () => {
        const template = getDashboardTemplate("plan-fact");
        if (!template) throw new Error("Template 'plan-fact' is not registered");
        const filters = {
          ...template.defaultFilters,
          ...parsed.filters,
        };
        return composeDashboardData(template, filters);
      },
      adaptTemplateResult: (composed) =>
        adaptTemplateToPlanFactLegacyResponse({
          composedData: composed,
          fallbackDashboardData: fallback,
        }),
      runAnalyticsFallback: async () =>
        calculatePlanFact({
          filters: {
            ...parsed.filters,
            valueTypes: parsed.filters.valueTypes.includes("business_plan")
              ? parsed.filters.valueTypes
              : [...parsed.filters.valueTypes, "business_plan"],
          },
          groupBy: parsed.groupBy,
          metrics: parsed.metrics,
          articles: parsed.articles,
          includeForecast: request.nextUrl.searchParams.get("includeForecast") === "true",
        }),
      adaptAnalyticsResult: (planFact) => {
        if (!planFact.rows.length) return { data: fallback, hasData: false };
        return {
          data: adaptPlanFactToDashboardData(fallback, planFact),
          hasData: true,
        };
      },
    });

    return NextResponse.json(result.data, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });

  } catch (error) {
    if (error instanceof DashboardDataNotFoundError) {
      return NextResponse.json({ error: "Dashboard data not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Dashboard data not found" }, { status: 500 });
  }
}
