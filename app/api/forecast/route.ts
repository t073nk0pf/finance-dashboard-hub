import { NextRequest, NextResponse } from "next/server";
import { adaptForecastToDashboardResponse, buildForecastFallbackResponse } from "@/lib/dashboard/adapters/forecastAdapter";
import { adaptTemplateToForecastLegacyResponse } from "@/lib/dashboard/adapters/templateToForecastLegacyAdapter";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { composeDashboardData } from "@/lib/dashboard/template/composer";
import { getDashboardTemplate } from "@/lib/dashboard/template/registry";
import { runDashboardTemplateRoutePipeline } from "@/lib/dashboard/template/routeOrchestrator";
import { runForecastForFilters } from "@/lib/forecast/service";

export async function GET(request: NextRequest) {
  const fallback = buildForecastFallbackResponse();
  try {
    const parsed = parseDashboardQueryParams(request.nextUrl.searchParams);
    if (parsed.warnings.length) {
      logDashboardFallback("invalid_query_params", {
        route: "/api/forecast",
        params: { warnings: parsed.warnings },
      });
    }

    const result = await runDashboardTemplateRoutePipeline({
      routeName: "/api/forecast",
      legacyFallbackData: fallback,
      runTemplate: async () => {
        const template = getDashboardTemplate("forecast");
        if (!template) throw new Error("Template 'forecast' is not registered");
        const filters = {
          ...template.defaultFilters,
          ...parsed.filters,
        };
        return composeDashboardData(template, filters);
      },
      adaptTemplateResult: (composed) =>
        adaptTemplateToForecastLegacyResponse({
          composedData: composed,
          fallbackForecastData: fallback,
        }),
      runAnalyticsFallback: async () =>
        runForecastForFilters({
          filters: {
            ...parsed.filters,
            valueTypes: parsed.filters.valueTypes.filter((valueType) => valueType === "fact" || valueType === "plan"),
          },
          method: parsed.method,
          scenarios: parsed.scenarios,
          metrics: parsed.metrics,
          asOfDate: parsed.asOfDate,
        }),
      adaptAnalyticsResult: (forecastResult) => {
        if (!forecastResult.rows.length) return { data: fallback, hasData: false };
        return {
          data: adaptForecastToDashboardResponse(forecastResult),
          hasData: true,
        };
      },
    });

    return NextResponse.json(result.data);
  } catch (error) {
    logDashboardFallback("analytics_engine_error", {
      route: "/api/forecast",
      note: error instanceof Error ? error.message : "unknown error",
    });
    logDashboardFallback("forecast_template_fallback_to_legacy", {
      route: "/api/forecast",
    });
    return NextResponse.json(fallback);
  }
}
