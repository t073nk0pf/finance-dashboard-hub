import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import { confirmImportRows, ImportConfirmInputError } from "@/lib/imports/confirmService";

export const runtime = "nodejs";

const confirmRequestSchema = z.object({
  sourceType: z.string().trim().min(1),
  rows: z.array(z.record(z.string(), z.unknown())),
  mapping: z
    .object({
      date: z.string().optional(),
      country: z.string().optional(),
      region: z.string().optional(),
      unitId: z.string().optional(),
      unitName: z.string().optional(),
      externalUnitId: z.string().optional(),
      metricKey: z.string().optional(),
      article: z.string().optional(),
      valueType: z.string().optional(),
      value: z.string().optional(),
      currency: z.string().optional(),
    })
    .partial()
    .optional(),
  options: z
    .object({
      strictMetrics: z.boolean().optional(),
      strictUnits: z.boolean().optional(),
    })
    .partial()
    .optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const json = await request.json().catch(() => null);
    const parsed = confirmRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_import_confirm_request",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const result = await confirmImportRows(parsed.data, session.sub);
    return NextResponse.json(result, {
      status: result.meta.rejected ? 422 : 200,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof ImportConfirmInputError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          ...error.details,
        },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Unable to confirm import" }, { status: 500 });
  }
}
