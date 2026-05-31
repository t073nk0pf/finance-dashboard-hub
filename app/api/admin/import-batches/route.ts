import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import {
  getAdminImportBatchesSummary,
  listAdminImportBatches,
  normalizeAdminImportBatchFilters,
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
    const normalized = normalizeAdminImportBatchFilters(request.nextUrl.searchParams);
    const [batchesResult, summary] = await Promise.all([
      listAdminImportBatches({
        sourceId: normalized.sourceId,
        sourceType: normalized.sourceType,
        status: normalized.status,
        from: normalized.from,
        to: normalized.to,
        limit: normalized.limit,
        offset: normalized.offset,
      }),
      getAdminImportBatchesSummary({
        sourceId: normalized.sourceId,
        sourceType: normalized.sourceType,
        status: normalized.status,
        from: normalized.from,
        to: normalized.to,
      }),
    ]);

    return NextResponse.json({
      batches: batchesResult.items,
      summary,
      pagination: batchesResult.pagination,
      filters: {
        sourceId: normalized.sourceId ?? null,
        sourceType: normalized.sourceType ?? null,
        status: normalized.status ?? null,
        from: normalized.from ?? null,
        to: normalized.to ?? null,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        warnings: normalized.warnings,
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      {
        batches: [],
        summary: { total: 0, completed: 0, failed: 0, running: 0, draft: 0 },
        pagination: { limit: 20, offset: 0, total: 0, hasMore: false },
        filters: { sourceId: null, sourceType: null, status: null, from: null, to: null },
        meta: {
          generatedAt: new Date().toISOString(),
          error: "Unable to list import batches",
        },
      },
      { status: 200 },
    );
  }
}
