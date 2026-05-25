const baseUrl = process.env.BASE_URL ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const expectations = [
  { route: "/login", type: "status", status: 200 },
  { route: "/", type: "login-redirect" },
  { route: "/dashboards/plan-fact", type: "login-redirect" },
  { route: "/armenia", type: "login-redirect" },
  { route: "/tv/armenia", type: "login-redirect" },
  { route: "/admin/users", type: "login-redirect" },
  { route: "/admin/imports", type: "login-redirect" },
  { route: "/admin/metrics", type: "login-redirect" },
  { route: "/api/dashboards/plan-fact", type: "status", status: 401 },
  { route: "/api/dashboards/armenia", type: "status", status: 401 },
];

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function locationPath(value) {
  if (!value) return "";
  try {
    return new URL(value, origin).pathname;
  } catch {
    return "";
  }
}

function evaluate(expectation, response) {
  if (expectation.type === "status") {
    return response.status === expectation.status;
  }

  if (expectation.type === "login-redirect") {
    return [307, 308].includes(response.status) && locationPath(response.headers.get("location")) === "/login";
  }

  return false;
}

const origin = normalizeBaseUrl(baseUrl);
let failed = false;

for (const expectation of expectations) {
  try {
    const response = await fetch(`${origin}${expectation.route}`, {
      redirect: "manual",
    });
    const ok = evaluate(expectation, response);
    if (!ok) failed = true;
    const location = response.headers.get("location");
    const suffix = location ? ` -> ${location}` : "";
    console.log(`${expectation.route} ${response.status}${suffix} ${ok ? "OK" : "FAIL"}`);
  } catch (error) {
    failed = true;
    console.log(`${expectation.route} 000 FAIL ${error instanceof Error ? error.message : "Request failed"}`);
  }
}

if (failed) {
  process.exitCode = 1;
}
