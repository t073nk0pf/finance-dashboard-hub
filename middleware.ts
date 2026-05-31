import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/session";
import { canAccessAdminRoute, canAccessApiRoute, canMutateData } from "@/lib/permissions";

const protectedPrefixes = ["/dashboards", "/admin", "/armenia", "/tv", "/api/dashboards", "/api/analytics", "/api/integrations", "/api/imports", "/api/forecast"];
const defaultAuthenticatedPath = "/dashboards/plan-fact";
const forbiddenPath = "/forbidden";

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isInternalAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(?:avif|css|gif|ico|jpg|jpeg|js|map|png|svg|txt|webp|woff|woff2)$/i.test(pathname)
  );
}

function redirectToLogin(request: NextRequest, includeNext = true): NextResponse {
  const loginUrl = new URL("/login", request.url);
  if (includeNext) {
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }
  return NextResponse.redirect(loginUrl);
}

function redirectToDefault(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(defaultAuthenticatedPath, request.url));
}

function rewriteToForbidden(request: NextRequest): NextResponse {
  return NextResponse.rewrite(new URL(forbiddenPath, request.url), { status: 403 });
}

export async function middleware(request: NextRequest) {
  if (process.env.DISABLE_AUTH === "true") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isInternalAsset(pathname) || pathname.startsWith("/api/auth/")) return NextResponse.next();

  const secret = process.env.SESSION_SECRET ?? "";
  const token = request.cookies.get(sessionCookieName)?.value;
  const session = await verifySessionToken(token, secret);

  if (pathname === "/login") {
    return session ? redirectToDefault(request) : NextResponse.next();
  }

  if (pathname === forbiddenPath) {
    return session ? NextResponse.next() : redirectToLogin(request, false);
  }

  if (pathname === "/") {
    return session ? redirectToDefault(request) : redirectToLogin(request, false);
  }

  if (!isProtectedPath(pathname)) return NextResponse.next();

  if (!session && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session) return redirectToLogin(request);

  if (pathname.startsWith("/api/")) {
    return canAccessApiRoute(session.role, pathname, request.method)
      ? NextResponse.next()
      : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (pathname.startsWith("/admin") && !canAccessAdminRoute(session.role, pathname)) {
    return rewriteToForbidden(request);
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && !canMutateData(session.role)) {
    return rewriteToForbidden(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
