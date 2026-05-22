const baseUrl = process.env.BASE_URL ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
const adminPassword = process.env.ADMIN_PASSWORD ?? "admin";

const routes = [
  "/",
  "/login",
  "/dashboards/plan-fact",
  "/armenia",
  "/tv/armenia",
  "/admin/users",
  "/admin/imports",
  "/admin/metrics",
  "/api/dashboards/plan-fact",
  "/api/dashboards/armenia",
];

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function getSessionCookie(origin) {
  try {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      redirect: "manual",
    });

    const setCookie = response.headers.get("set-cookie");
    if (!response.ok || !setCookie) return "";
    return setCookie.split(";")[0];
  } catch {
    return "";
  }
}

const origin = normalizeBaseUrl(baseUrl);
const sessionCookie = await getSessionCookie(origin);
let failed = false;

for (const route of routes) {
  try {
    const response = await fetch(`${origin}${route}`, {
      headers: sessionCookie ? { Cookie: sessionCookie } : undefined,
      redirect: "manual",
    });
    const ok = response.status === 200;
    if (!ok) failed = true;
    console.log(`${route} ${response.status} ${ok ? "OK" : "FAIL"}`);
  } catch (error) {
    failed = true;
    console.log(`${route} 000 FAIL ${error instanceof Error ? error.message : "Request failed"}`);
  }
}

if (failed) {
  process.exitCode = 1;
}
