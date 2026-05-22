import { NextResponse } from "next/server";
import { DashboardDataNotFoundError, getPlanFactDashboardData } from "@/lib/data/dashboardDataService";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getPlanFactDashboardData({ source: "static-json" });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    if (error instanceof DashboardDataNotFoundError) {
      return NextResponse.json({ error: "Dashboard data not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Dashboard data not found" }, { status: 500 });
  }
}
