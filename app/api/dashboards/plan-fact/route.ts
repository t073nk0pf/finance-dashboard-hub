import { NextRequest, NextResponse } from "next/server";
import { calculatePlanFact } from "@/lib/analytics/planFact";
import { adaptPlanFactToDashboardData } from "@/lib/dashboard/adapters/planFactAdapter";
import { isAnalyticsEngineEnabled } from "@/lib/dashboard/featureFlags";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { DashboardDataNotFoundError, getPlanFactDashboardData } from "@/lib/data/dashboardDataService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const fallback = await getPlanFactDashboardData({ source: "static-json" });
    if (!isAnalyticsEngineEnabled()) {
      logDashboardFallback("analytics_engine_disabled", {
        route: "/api/dashboards/plan-fact",
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
          route: "/api/dashboards/plan-fact",
          params: { warnings: parsed.warnings },
        });
      }

      const planFact = await calculatePlanFact({
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
      });

      const data = planFact.rows.length ? adaptPlanFactToDashboardData(fallback, planFact) : fallback;
      if (!planFact.rows.length) {
        logDashboardFallback("analytics_engine_empty_result", {
          route: "/api/dashboards/plan-fact",
          params: { groupBy: parsed.groupBy, metrics: parsed.metrics?.length ?? 0 },
        });
      }
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (error) {
      logDashboardFallback("analytics_engine_error", {
        route: "/api/dashboards/plan-fact",
        note: error instanceof Error ? error.message : "unknown error",
      });
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      });
    }

  } catch (error) {
    if (error instanceof DashboardDataNotFoundError) {
      return NextResponse.json({ error: "Dashboard data not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Dashboard data not found" }, { status: 500 });
  }
}
