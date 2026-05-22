import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    scenarios: [],
    next: "Forecast engine placeholder. Rules will be stored in NetworkGrowthScenario and ManualAdjustment.",
  });
}
