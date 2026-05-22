import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    imports: [],
    next: "Connect XLSX/Google Sheets import pipeline and persist ImportBatch rows.",
  });
}
