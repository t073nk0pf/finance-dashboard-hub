export type AppRole = "ADMIN" | "FINANCE" | "DIRECTOR" | "MANAGER" | "VIEWER";

export const appRoles: AppRole[] = ["ADMIN", "FINANCE", "DIRECTOR", "MANAGER", "VIEWER"];

const dashboardPrefixes = ["/dashboards", "/armenia", "/tv"];
const mutationSegments = ["/edit", "/create", "/update", "/delete"];

export function normalizeRole(role: string | null | undefined): AppRole {
  const normalized = (role ?? "").toUpperCase();
  return appRoles.includes(normalized as AppRole) ? (normalized as AppRole) : "VIEWER";
}

export function canViewDashboard(role: string | null | undefined): boolean {
  return appRoles.includes(normalizeRole(role));
}

export function canManageUsers(role: string | null | undefined): boolean {
  return normalizeRole(role) === "ADMIN";
}

export function canManageImports(role: string | null | undefined): boolean {
  return ["ADMIN", "FINANCE"].includes(normalizeRole(role));
}

export function canManageMetrics(role: string | null | undefined): boolean {
  return ["ADMIN", "FINANCE"].includes(normalizeRole(role));
}

export function canMutateData(role: string | null | undefined): boolean {
  return ["ADMIN", "FINANCE"].includes(normalizeRole(role));
}

export function canAccessAdminRoute(role: string | null | undefined, pathname: string): boolean {
  if (pathname.startsWith("/admin/users")) return canManageUsers(role);
  if (pathname.startsWith("/admin/imports")) return canManageImports(role);
  if (pathname.startsWith("/admin/metrics")) return canManageMetrics(role);
  if (pathname.startsWith("/admin/forecast-rules")) return canManageMetrics(role);
  return normalizeRole(role) === "ADMIN";
}

export function canAccessApiRoute(role: string | null | undefined, pathname: string, method: string): boolean {
  if (pathname.startsWith("/api/dashboards")) {
    return method === "GET" && canViewDashboard(role);
  }

  if (pathname.startsWith("/api/dashboard-template")) {
    return method === "GET" && canViewDashboard(role);
  }

  if (pathname.startsWith("/api/analytics")) return method === "GET" && canViewDashboard(role);
  if (pathname.startsWith("/api/integrations")) return normalizeRole(role) === "ADMIN";
  if (pathname.startsWith("/api/imports")) return canManageImports(role);
  if (pathname.startsWith("/api/forecast")) return method === "GET" ? canViewDashboard(role) : canManageMetrics(role);

  if (method !== "GET") return canMutateData(role);
  return canViewDashboard(role);
}

export function canAccessSection(role: string | null | undefined, pathname: string): boolean {
  if (pathname.startsWith("/admin")) return canAccessAdminRoute(role, pathname);
  if (dashboardPrefixes.some((section) => pathname.startsWith(section))) return canViewDashboard(role);
  if (mutationSegments.some((segment) => pathname.includes(segment))) return canMutateData(role);
  return canViewDashboard(role);
}

export function isReadOnlyRole(role: string | null | undefined): boolean {
  return ["DIRECTOR", "MANAGER", "VIEWER"].includes(normalizeRole(role));
}
