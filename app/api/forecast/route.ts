import { NextRequest, NextResponse } from "next/server";
import { adaptForecastToDashboardResponse, buildForecastFallbackResponse } from "@/lib/dashboard/adapters/forecastAdapter";
import { isAnalyticsEngineEnabled } from "@/lib/dashboard/featureFlags";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { runForecastForFilters } from "@/lib/forecast/service";

export async function GET(request: NextRequest) {
  const fallback = buildForecastFallbackResponse();
  if (!isAnalyticsEngineEnabled()) {
    logDashboardFallback("analytics_engine_disabled", {
      route: "/api/forecast",
    });
    return NextResponse.json(fallback);
  }

  try {
    const parsed = parseDashboardQueryParams(request.nextUrl.searchParams);
    if (parsed.warnings.length) {
      logDashboardFallback("invalid_query_params", {
        route: "/api/forecast",
        params: { warnings: parsed.warnings },
      });
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
      return NextResponse.json(fallback);
    }
    return NextResponse.json(adaptForecastToDashboardResponse(result));
  } catch (error) {
    logDashboardFallback("analytics_engine_error", {
      route: "/api/forecast",
      note: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(fallback);
  }
}
