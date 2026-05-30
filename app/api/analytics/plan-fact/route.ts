import { NextRequest, NextResponse } from "next/server";
import { calculatePlanFact } from "@/lib/analytics/planFact";
import { normalizeDashboardFilters } from "@/lib/analytics/filters";
import type { PlanFactGroupBy, PlanFactInput } from "@/lib/analytics/types";

export const runtime = "nodejs";

const allowedGroupBy: PlanFactGroupBy[] = ["total", "country", "region", "unit", "article", "metric", "month", "week", "day"];

function parseCsvParam(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const groupByParam = params.get("groupBy");

    const filters = normalizeDashboardFilters({
      country: params.get("country") ?? "all",
      region: params.get("region") ?? "all",
      unitId: params.get("unitId"),
      aggregationMode: (params.get("aggregationMode") as PlanFactInput["filters"]["aggregationMode"]) ?? "period",
      dateRange: {
        from: params.get("from") ?? "2026-01-01",
        to: params.get("to") ?? "2026-12-31",
      },
      valueTypes: ["fact", "plan", "business_plan"],
      compareMode: "plan",
    });

    const input: PlanFactInput = {
      filters,
      groupBy: allowedGroupBy.includes(groupByParam as PlanFactGroupBy) ? (groupByParam as PlanFactGroupBy) : "total",
      metrics: parseCsvParam(params.get("metrics")),
      articles: parseCsvParam(params.get("articles")),
      includeForecast: params.get("includeForecast") === "true",
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
