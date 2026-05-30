import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import { confirmImport } from "@/lib/imports/service";
import type { ConfirmImportRequest } from "@/lib/imports/types";

export const runtime = "nodejs";

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const input = (await request.json().catch(() => null)) as ConfirmImportRequest | null;

    if (!input?.sourceType || !input.mappingProfile || !Array.isArray(input.rows)) {
      return NextResponse.json({ error: "Invalid import confirm request" }, { status: 400 });
    }

    const result = await confirmImport(input, session.sub);
    return NextResponse.json(result, { status: result.status === "failed" ? 422 : 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to confirm import" }, { status: 500 });
  }
}
