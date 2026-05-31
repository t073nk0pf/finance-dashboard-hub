import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import {
  getAdminDataSourcesSummary,
  listAdminDataSources,
  normalizeAdminDataSourceFilters,
} from "@/lib/admin/dataSourcesService";

export const runtime = "nodejs";

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["ADMIN"]);
    const normalized = normalizeAdminDataSourceFilters(request.nextUrl.searchParams);
    const [sourcesResult, summary] = await Promise.all([
      listAdminDataSources({
        type: normalized.type,
        status: normalized.status,
        search: normalized.search,
        limit: normalized.limit,
        offset: normalized.offset,
      }),
      getAdminDataSourcesSummary({
        type: normalized.type,
        status: normalized.status,
        search: normalized.search,
      }),
    ]);

    return NextResponse.json({
      sources: sourcesResult.items,
      summary,
      pagination: sourcesResult.pagination,
      filters: {
        type: normalized.type ?? null,
        status: normalized.status ?? null,
        search: normalized.search ?? null,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        source: "admin_data_sources",
        warnings: normalized.warnings,
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      {
        sources: [],
        summary: { total: 0, active: 0, failed: 0, neverSynced: 0 },
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
        filters: { type: null, status: null, search: null },
        meta: {
          generatedAt: new Date().toISOString(),
          source: "admin_data_sources",
          error: "Unable to list data sources",
        },
      },
      { status: 200 },
    );
  }
}
