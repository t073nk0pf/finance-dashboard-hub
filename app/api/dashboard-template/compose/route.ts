import { NextRequest, NextResponse } from "next/server";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";
import { parseDashboardQueryParams } from "@/lib/dashboard/queryFilters";
import { composeDashboardData } from "@/lib/dashboard/template/composer";
import { getDashboardTemplate, listDashboardTemplates } from "@/lib/dashboard/template/registry";

export const runtime = "nodejs";

const templateAliases: Record<string, string> = {
  armenia: "armenia-overview",
  russia: "russia-overview",
  "plan-fact": "plan-fact",
  forecast: "forecast",
  "overview-all": "overview-all",
  "tv-armenia": "tv-armenia",
};

function resolveTemplateId(raw: string | null): string {
  if (!raw) return "overview-all";
  return templateAliases[raw] ?? raw;
}

export async function GET(request: NextRequest) {
  try {
    const parsed = parseDashboardQueryParams(request.nextUrl.searchParams);
    if (parsed.warnings.length) {
      logDashboardFallback("invalid_query_params", {
        route: "/api/dashboard-template/compose",
        params: { warnings: parsed.warnings },
      });
    }

    const requestedTemplateId = request.nextUrl.searchParams.get("templateId");
    const templateId = resolveTemplateId(requestedTemplateId);
    const template = getDashboardTemplate(templateId);

    if (!template) {
      return NextResponse.json(
        {
          error: "unknown_template",
          message: `Template '${requestedTemplateId ?? ""}' is not registered`,
          availableTemplates: listDashboardTemplates().map((item) => item.id),
        },
        { status: 400 },
      );
    }

    const countryFromTemplate = template.scope.country;
    const country =
      countryFromTemplate === "armenia" ? "armenia" : countryFromTemplate === "russia" ? "russia" : parsed.filters.country;

    const filters = {
      ...template.defaultFilters,
      ...parsed.filters,
      country,
    };

    const composed = await composeDashboardData(template, filters);

    return NextResponse.json(
      {
        template: {
          id: template.id,
          title: template.title,
          scope: template.scope,
          sections: template.sections,
        },
        filters,
        data: composed,
        meta: {
          generatedAt: composed.generatedAt,
          source: "template_composer",
          warnings: parsed.warnings,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "template_compose_error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
