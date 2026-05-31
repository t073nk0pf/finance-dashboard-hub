import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import { getAdminImportBatchesSummary, listAdminImportBatches } from "@/lib/admin/dataSourcesService";

export const runtime = "nodejs";

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["ADMIN"]);
    const sourceId = request.nextUrl.searchParams.get("sourceId") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    const batches = await listAdminImportBatches({
      sourceId: sourceId || undefined,
      status: status || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    const summary = getAdminImportBatchesSummary(batches);

    return NextResponse.json({
      batches,
      summary,
      meta: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      {
        batches: [],
        summary: { total: 0, completed: 0, failed: 0, running: 0, draft: 0 },
        meta: {
          generatedAt: new Date().toISOString(),
          error: "Unable to list import batches",
        },
      },
      { status: 200 },
    );
  }
}
