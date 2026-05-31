import { NextRequest, NextResponse } from "next/server";
import { calculatePlanFact } from "@/lib/analytics/planFact";
import { adaptArmeniaDashboardData } from "@/lib/dashboard/adapters/armeniaAdapter";
import { adaptTemplateToArmeniaLegacyResponse } from "@/lib/dashboard/adapters/templateToArmeniaLegacyAdapter";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { composeDashboardData } from "@/lib/dashboard/template/composer";
import { getDashboardTemplate } from "@/lib/dashboard/template/registry";
import { runDashboardTemplateRoutePipeline } from "@/lib/dashboard/template/routeOrchestrator";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";
import { DashboardDataNotFoundError } from "@/lib/data/dashboardDataService";
import { runForecastForFilters } from "@/lib/forecast/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const fallback = await getArmeniaDashboardData({ source: "static-json" });
    const parsed = parseDashboardQueryParams(request.nextUrl.searchParams);
    if (parsed.warnings.length) {
      logDashboardFallback("invalid_query_params", {
        route: "/api/dashboards/armenia",
        params: { warnings: parsed.warnings },
      });
    }

    const filters = {
      ...parsed.filters,
      country: parsed.filters.country === "all" ? "armenia" : parsed.filters.country,
    };

    const result = await runDashboardTemplateRoutePipeline({
      routeName: "/api/dashboards/armenia",
      legacyFallbackData: fallback,
      runTemplate: async () => {
        const template = getDashboardTemplate("armenia-overview");
        if (!template) throw new Error("Template 'armenia-overview' is not registered");
        return composeDashboardData(template, {
          ...template.defaultFilters,
          ...filters,
          country: "armenia",
        });
      },
      adaptTemplateResult: (composed) =>
        adaptTemplateToArmeniaLegacyResponse({
          composedData: composed,
          fallbackArmeniaData: fallback,
        }),
      runAnalyticsFallback: async () => {
        const [planFact, forecast] = await Promise.all([
          calculatePlanFact({
            filters: {
              ...filters,
              valueTypes: filters.valueTypes.includes("business_plan")
                ? filters.valueTypes
                : [...filters.valueTypes, "business_plan"],
            },
            groupBy: parsed.groupBy,
            metrics: parsed.metrics,
            articles: parsed.articles,
          }),
          runForecastForFilters({
            filters: {
              ...filters,
              valueTypes: filters.valueTypes.filter((valueType) => valueType === "fact" || valueType === "plan"),
            },
            method: parsed.method,
            scenarios: parsed.scenarios,
            metrics: parsed.metrics,
            asOfDate: parsed.asOfDate,
          }),
        ]);
        return { planFact, forecast };
      },
      adaptAnalyticsResult: ({ planFact, forecast }) => {
        if (!planFact.rows.length) return { data: fallback, hasData: false };
        return {
          data: adaptArmeniaDashboardData({
            fallback,
            planFact,
            forecast,
          }),
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
      return NextResponse.json({ error: "Armenia dashboard data not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Armenia dashboard data not found" }, { status: 500 });
  }
}
