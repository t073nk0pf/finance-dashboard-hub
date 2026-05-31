import { NextRequest, NextResponse } from "next/server";
import { adaptForecastToDashboardResponse, buildForecastFallbackResponse } from "@/lib/dashboard/adapters/forecastAdapter";
import { adaptTemplateToForecastLegacyResponse } from "@/lib/dashboard/adapters/templateToForecastLegacyAdapter";
import { isAnalyticsEngineEnabled, isDashboardTemplateEnabled } from "@/lib/dashboard/featureFlags";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { composeDashboardData } from "@/lib/dashboard/template/composer";
import { getDashboardTemplate } from "@/lib/dashboard/template/registry";
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

    const templateEnabled = isDashboardTemplateEnabled();
    const analyticsEnabled = isAnalyticsEngineEnabled();

    if (!templateEnabled) {
      logDashboardFallback("forecast_template_disabled", {
        route: "/api/forecast",
      });
    }

    if (templateEnabled) {
      try {
        const template = getDashboardTemplate("forecast");
        if (!template) throw new Error("Template 'forecast' is not registered");
        const filters = {
          ...template.defaultFilters,
          ...parsed.filters,
        };
        const composed = await composeDashboardData(template, filters);
        const adapted = adaptTemplateToForecastLegacyResponse({
          composedData: composed,
          fallbackForecastData: fallback,
        });

        if (adapted.hasData) {
          return NextResponse.json(adapted.data);
        }

        logDashboardFallback("forecast_template_empty_result", {
          route: "/api/forecast",
        });
        logDashboardFallback("forecast_template_fallback_to_analytics", {
          route: "/api/forecast",
        });
      } catch (error) {
        logDashboardFallback("forecast_template_error", {
          route: "/api/forecast",
          note: error instanceof Error ? error.message : "unknown error",
        });
        logDashboardFallback("forecast_template_fallback_to_analytics", {
          route: "/api/forecast",
        });
      }
    }

    if (!analyticsEnabled) {
      logDashboardFallback("analytics_engine_disabled", {
        route: "/api/forecast",
      });
      logDashboardFallback("forecast_template_fallback_to_legacy", {
        route: "/api/forecast",
      });
      return NextResponse.json(fallback);
    }

    const result = await runForecastForFilters({
      filters: {
        ...parsed.filters,
        valueTypes: parsed.filters.valueTypes.filter((valueType) => valueType === "fact" || valueType === "plan"),
      },
      method: parsed.method,
      scenarios: parsed.scenarios,
      metrics: parsed.metrics,
      asOfDate: parsed.asOfDate,
    });

    if (!result.rows.length) {
      logDashboardFallback("analytics_engine_empty_result", {
        route: "/api/forecast",
        params: { scenarios: parsed.scenarios?.length ?? 0, metrics: parsed.metrics?.length ?? 0 },
      });
      logDashboardFallback("forecast_template_fallback_to_legacy", {
        route: "/api/forecast",
      });
      return NextResponse.json(fallback);
    }
    return NextResponse.json(adaptForecastToDashboardResponse(result));
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
