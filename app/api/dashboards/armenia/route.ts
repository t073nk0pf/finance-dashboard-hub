import { NextResponse } from "next/server";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";
import { DashboardDataNotFoundError } from "@/lib/data/dashboardDataService";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getArmeniaDashboardData({ source: "static-json" });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    if (error instanceof DashboardDataNotFoundError) {
      return NextResponse.json({ error: "Armenia dashboard data not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Armenia dashboard data not found" }, { status: 500 });
  }
}
