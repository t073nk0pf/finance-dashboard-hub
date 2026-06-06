import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import { createImportPreview } from "@/lib/imports/service";
import type { ImportPreviewRequest } from "@/lib/imports/types";

export const runtime = "nodejs";

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = (await request.json().catch(() => null)) as ImportPreviewRequest | null;

    if (!input?.sourceType) {
      return NextResponse.json({ error: "Invalid import preview request" }, { status: 400 });
    }

    const preview = await createImportPreview(input);
    return NextResponse.json(preview);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Unable to create import preview" }, { status: 500 });
  }
}
