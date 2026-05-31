import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import { getAdminDataSourcesSummary, listAdminDataSources } from "@/lib/admin/dataSourcesService";

export const runtime = "nodejs";

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["ADMIN"]);
    const sources = await listAdminDataSources();
    const summary = getAdminDataSourcesSummary(sources);

    return NextResponse.json({
      sources,
      summary,
      meta: {
        generatedAt: new Date().toISOString(),
        source: "admin_data_sources",
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      {
        sources: [],
        summary: { total: 0, active: 0, failed: 0, neverSynced: 0 },
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
