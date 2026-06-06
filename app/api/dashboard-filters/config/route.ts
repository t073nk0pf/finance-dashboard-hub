import { NextRequest, NextResponse } from "next/server";
import { getDashboardFilterConfig, getDashboardFilterConfigWithDynamicOptions } from "@/lib/dashboard/filters/config";
import { getDashboardFilterPresets } from "@/lib/dashboard/filters/presets";
import { searchParamsToFilters } from "@/lib/dashboard/filters/urlState";
import type { DashboardCountry } from "@/lib/dashboard/filters/types";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";

export const runtime = "nodejs";

const supportedParams = [
  "country",
  "region",
  "unitId",
  "from",
  "to",
  "aggregationMode",
  "compareMode",
  "groupBy",
  "metrics",
  "articles",
  "valueTypes",
  "asOfDate",
  "scenarios",
  "method",
  "scope",
  "templateId",
] as const;

function resolveScopeCountry(searchParams: URLSearchParams, fallbackCountry: DashboardCountry): DashboardCountry {
  const scope = searchParams.get("scope");
  if (scope === "armenia" || scope === "russia" || scope === "all") return scope;

  const templateId = searchParams.get("templateId");
  if (templateId === "armenia" || templateId === "armenia-overview" || templateId === "tv-armenia") return "armenia";
  if (templateId === "russia" || templateId === "russia-overview") return "russia";

  return fallbackCountry;
}

export async function GET(request: NextRequest) {
  const query = parseDashboardQueryParams(request.nextUrl.searchParams);
  const parsed = searchParamsToFilters(request.nextUrl.searchParams);
  const scopeCountry = resolveScopeCountry(request.nextUrl.searchParams, parsed.country);
  const dynamicConfigResult = await getDashboardFilterConfigWithDynamicOptions({
    country: scopeCountry,
    region: parsed.region,
    unitId: parsed.unitId,
  }).catch(() => ({ config: getDashboardFilterConfig({ country: scopeCountry }), dynamicOptionsResolved: false }));
  const presets = getDashboardFilterPresets();

  const warnings: string[] = [...query.warnings];
  if (!dynamicConfigResult.dynamicOptionsResolved) warnings.push("dynamic_options_unavailable");

  if (warnings.length) {
    logDashboardFallback("invalid_query_params", {
      route: "/api/dashboard-filters/config",
      params: { warnings },
    });
  }

  return NextResponse.json(
    {
      filters: parsed,
      config: dynamicConfigResult.config,
      presets,
      supportedParams,
      meta: {
        generatedAt: new Date().toISOString(),
        source: "dashboard_filter_config",
        dynamicOptions: dynamicConfigResult.dynamicOptionsResolved,
        warnings: [...new Set(warnings)],
      },
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    },
  );
}
