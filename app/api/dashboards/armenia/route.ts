import { NextRequest, NextResponse } from "next/server";
import { calculatePlanFact } from "@/lib/analytics/planFact";
import { adaptArmeniaDashboardData } from "@/lib/dashboard/adapters/armeniaAdapter";
import { isAnalyticsEngineEnabled } from "@/lib/dashboard/featureFlags";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";
import { DashboardDataNotFoundError } from "@/lib/data/dashboardDataService";
import { runForecastForFilters } from "@/lib/forecast/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const fallback = await getArmeniaDashboardData({ source: "static-json" });

    if (!isAnalyticsEngineEnabled()) {
      logDashboardFallback("analytics_engine_disabled", {
        route: "/api/dashboards/armenia",
      });
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    try {
      const parsed = parseDashboardQueryParams(request.nextUrl.searchParams);
      if (parsed.warnings.length) {
        logDashboardFallback("invalid_query_params", {
          route: "/api/dashboards/armenia",
          params: { warnings: parsed.warnings },
        });
      }

      const country = parsed.filters.country === "all" ? "armenia" : parsed.filters.country;
      const filters = {
        ...parsed.filters,
        country,
      };

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

      const data = adaptArmeniaDashboardData({
        fallback,
        planFact,
        forecast,
      });

      if (!planFact.rows.length) {
        logDashboardFallback("legacy_armenia_fallback", {
          route: "/api/dashboards/armenia",
          note: "Plan-fact result is empty, legacy data returned",
        });
      }

      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (error) {
      logDashboardFallback("analytics_engine_error", {
        route: "/api/dashboards/armenia",
        note: error instanceof Error ? error.message : "unknown error",
      });
      logDashboardFallback("legacy_armenia_fallback", {
        route: "/api/dashboards/armenia",
        note: "Engine failed, legacy data returned",
      });
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      });
    }
  } catch (error) {
    if (error instanceof DashboardDataNotFoundError) {
      return NextResponse.json({ error: "Armenia dashboard data not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Armenia dashboard data not found" }, { status: 500 });
  }
}
