import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/session";

const protectedPrefixes = ["/dashboards", "/admin", "/armenia", "/tv", "/api/dashboards", "/api/imports", "/api/forecast"];

export async function middleware(request: NextRequest) {
  if (process.env.DISABLE_AUTH === "true") return NextResponse.next();

  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const secret = process.env.SESSION_SECRET ?? "";
  const token = request.cookies.get(sessionCookieName)?.value;
  const session = await verifySessionToken(token, secret);

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboards/:path*",
    "/admin/:path*",
    "/armenia/:path*",
    "/tv/:path*",
    "/api/dashboards/:path*",
    "/api/imports/:path*",
    "/api/forecast/:path*",
  ],
};
