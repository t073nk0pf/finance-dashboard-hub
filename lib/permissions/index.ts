export const protectedSections = ["/dashboards", "/admin", "/armenia", "/tv"];

export function canAccessSection(role: string, pathname: string): boolean {
  if (role === "ADMIN") return true;
  if (pathname.startsWith("/admin")) return false;
  return protectedSections.some((section) => pathname.startsWith(section));
}
