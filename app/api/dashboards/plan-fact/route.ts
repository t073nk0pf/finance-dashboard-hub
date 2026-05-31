import { NextRequest, NextResponse } from "next/server";
import { calculatePlanFact } from "@/lib/analytics/planFact";
import { adaptPlanFactToDashboardData } from "@/lib/dashboard/adapters/planFactAdapter";
import { adaptTemplateToPlanFactLegacyResponse } from "@/lib/dashboard/adapters/templateToPlanFactLegacyAdapter";
import { isAnalyticsEngineEnabled, isDashboardTemplateEnabled } from "@/lib/dashboard/featureFlags";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { composeDashboardData } from "@/lib/dashboard/template/composer";
import { getDashboardTemplate } from "@/lib/dashboard/template/registry";
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

    const templateEnabled = isDashboardTemplateEnabled();
    const analyticsEnabled = isAnalyticsEngineEnabled();

    if (!templateEnabled) {
      logDashboardFallback("dashboard_template_disabled", {
        route: "/api/dashboards/plan-fact",
      });
    }

    if (templateEnabled) {
      try {
        const template = getDashboardTemplate("plan-fact");
        if (!template) throw new Error("Template 'plan-fact' is not registered");
        const filters = {
          ...template.defaultFilters,
          ...parsed.filters,
        };
        const composed = await composeDashboardData(template, filters);
        const adapted = adaptTemplateToPlanFactLegacyResponse({
          composedData: composed,
          fallbackDashboardData: fallback,
        });

        if (adapted.hasData) {
          return NextResponse.json(
            adapted.data,
            {
              headers: {
                "Cache-Control": "private, max-age=60",
              },
            },
          );
        }

        logDashboardFallback("dashboard_template_empty_result", {
          route: "/api/dashboards/plan-fact",
        });
        logDashboardFallback("dashboard_template_fallback_to_analytics", {
          route: "/api/dashboards/plan-fact",
        });
      } catch (error) {
        logDashboardFallback("dashboard_template_error", {
          route: "/api/dashboards/plan-fact",
          note: error instanceof Error ? error.message : "unknown error",
        });
        logDashboardFallback("dashboard_template_fallback_to_analytics", {
          route: "/api/dashboards/plan-fact",
        });
      }
    }

    if (!analyticsEnabled) {
      logDashboardFallback("analytics_engine_disabled", {
        route: "/api/dashboards/plan-fact",
      });
      logDashboardFallback("dashboard_template_fallback_to_legacy", {
        route: "/api/dashboards/plan-fact",
      });
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    try {
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
        logDashboardFallback("dashboard_template_fallback_to_legacy", {
          route: "/api/dashboards/plan-fact",
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
      logDashboardFallback("dashboard_template_fallback_to_legacy", {
        route: "/api/dashboards/plan-fact",
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
