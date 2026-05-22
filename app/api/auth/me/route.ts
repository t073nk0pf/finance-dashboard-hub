import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(sessionCookieName)?.value, process.env.SESSION_SECRET ?? "");
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: session });
}
