import { NextRequest, NextResponse } from "next/server";
import { normalizeDashboardFilters } from "@/lib/analytics/filters";
import { runForecastForFilters } from "@/lib/forecast/service";
import type { ForecastInput, ForecastMethod, ForecastScenario } from "@/lib/forecast/types";

export const runtime = "nodejs";

const allowedScenarios: ForecastScenario[] = ["pessimistic", "base", "optimistic"];
const allowedMethods: ForecastMethod[] = ["current_pace", "plan_distribution", "previous_period", "manual"];

function parseCsv(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length ? parsed : undefined;
}

function parseScenarios(value: string | null): ForecastScenario[] | undefined {
  const scenarios = parseCsv(value);
  if (!scenarios) return undefined;
  const filtered = scenarios.filter((scenario): scenario is ForecastScenario =>
    allowedScenarios.includes(scenario as ForecastScenario),
  );
  return filtered.length ? filtered : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const method = params.get("method");

    const filters = normalizeDashboardFilters({
      country: params.get("country") ?? "all",
      region: params.get("region") ?? "all",
      unitId: params.get("unitId"),
      aggregationMode: (params.get("aggregationMode") as ForecastInput["filters"]["aggregationMode"]) ?? "period",
      dateRange: {
        from: params.get("from") ?? "2026-01-01",
        to: params.get("to") ?? "2026-12-31",
      },
      compareMode: "plan",
      valueTypes: ["fact", "plan"],
    });

    const input: ForecastInput = {
      filters,
      metrics: parseCsv(params.get("metrics")),
      scenarios: parseScenarios(params.get("scenarios")),
      asOfDate: params.get("asOfDate") ?? undefined,
      method: allowedMethods.includes(method as ForecastMethod) ? (method as ForecastMethod) : "current_pace",
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
