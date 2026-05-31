import { NextRequest, NextResponse } from "next/server";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { runForecastForFilters } from "@/lib/forecast/service";
import type { ForecastInput } from "@/lib/forecast/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const parsed = parseDashboardQueryParams(request.nextUrl.searchParams);
    if (parsed.warnings.length) {
      logDashboardFallback("invalid_query_params", {
        route: "/api/analytics/forecast",
        params: { warnings: parsed.warnings },
      });
    }

    const input: ForecastInput = {
      filters: {
        ...parsed.filters,
        valueTypes: parsed.filters.valueTypes.filter((valueType) => valueType === "fact" || valueType === "plan"),
      },
      metrics: parsed.metrics,
      scenarios: parsed.scenarios,
      asOfDate: parsed.asOfDate,
      method: parsed.method,
    };

    const result = await runForecastForFilters(input);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Forecast engine error", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
