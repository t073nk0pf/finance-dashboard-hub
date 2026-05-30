import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import { listImportBatches } from "@/lib/imports/service";

export const runtime = "nodejs";

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ["ADMIN"]);
    const sourceType = request.nextUrl.searchParams.get("sourceType") ?? undefined;
    const imports = await listImportBatches({
      sourceType: sourceType === "excel" || sourceType === "csv" || sourceType === "google_sheets" || sourceType === "manual"
        ? sourceType
        : undefined,
    });

    return NextResponse.json({ imports });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to list imports" }, { status: 500 });
  }
}
