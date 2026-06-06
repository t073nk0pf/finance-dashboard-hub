import { NextRequest, NextResponse } from "next/server";
import { AuthRequiredError, requireRole, RoleRequiredError } from "@/lib/auth/session";
import { syncDodoMetrics } from "@/lib/integrations/dodo/sync";
import type { DodoMetricKey, DodoSyncOptions } from "@/lib/integrations/dodo/types";

export const runtime = "nodejs";

const allowedMetrics: DodoMetricKey[] = [
  "revenue",
  "orders",
  "delivery_sales",
  "delivery_time",
  "dc",
  "stops",
  "production_time",
  "labor",
  "write_offs",
  "uc",
];

function authErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (error instanceof RoleRequiredError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const body = (await request.json().catch(() => null)) as Partial<DodoSyncOptions> | null;

    if (!body?.from || !body?.to) {
      return NextResponse.json({ error: "Invalid sync payload: from/to are required" }, { status: 400 });
    }

    const metrics = body.metrics?.filter((metric): metric is DodoMetricKey => allowedMetrics.includes(metric)) ?? [];
    if (!metrics.length) {
      return NextResponse.json({ error: "Invalid sync payload: metrics are required" }, { status: 400 });
    }

    const result = await syncDodoMetrics(
      {
        from: body.from,
        to: body.to,
        country: body.country,
        units: body.units,
        metrics,
        dryRun: body.dryRun ?? true,
      },
      session.sub,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Dodo sync failed", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
