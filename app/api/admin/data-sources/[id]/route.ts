import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import { getAdminDataSourceDetails, normalizeAdminDataSourceDetailsFilters } from "@/lib/admin/dataSourcesService";

export const runtime = "nodejs";

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await context.params;
    const normalized = normalizeAdminDataSourceDetailsFilters(request.nextUrl.searchParams);

    if (!id) {
      return NextResponse.json({ error: "Invalid data source id" }, { status: 400 });
    }

    const details = await getAdminDataSourceDetails(id, {
      batchStatus: normalized.batchStatus,
      batchFrom: normalized.batchFrom,
      batchTo: normalized.batchTo,
      batchLimit: normalized.batchLimit,
      batchOffset: normalized.batchOffset,
      errorLimit: normalized.errorLimit,
      errorOffset: normalized.errorOffset,
    });
    if (!details) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...details,
      meta: {
        generatedAt: new Date().toISOString(),
        source: "admin_data_source_details",
        warnings: normalized.warnings,
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      {
        error: "Unable to load data source details",
      },
      { status: 500 },
    );
  }
}
