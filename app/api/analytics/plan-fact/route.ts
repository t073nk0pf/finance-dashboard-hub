import { NextRequest, NextResponse } from "next/server";
import { calculatePlanFact } from "@/lib/analytics/planFact";
import type { PlanFactInput } from "@/lib/analytics/types";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const parsed = parseDashboardQueryParams(request.nextUrl.searchParams);
    if (parsed.warnings.length) {
      logDashboardFallback("invalid_query_params", {
        route: "/api/analytics/plan-fact",
        params: { warnings: parsed.warnings },
      });
    }

    const input: PlanFactInput = {
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
    };

    const result = await calculatePlanFact(input);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Plan-fact engine error", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
