const baseUrl = process.env.BASE_URL ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const viewerEmail = process.env.VIEWER_EMAIL;
const viewerPassword = process.env.VIEWER_PASSWORD;

const expectations = [
  { route: "/login", type: "status", status: 200 },
  { route: "/", type: "login-redirect" },
  { route: "/dashboards/plan-fact", type: "login-redirect" },
  { route: "/armenia", type: "login-redirect" },
  { route: "/tv/armenia", type: "login-redirect" },
  { route: "/admin/users", type: "login-redirect" },
  { route: "/admin/imports", type: "login-redirect" },
  { route: "/admin/metrics", type: "login-redirect" },
  { route: "/admin/data-sources", type: "login-redirect" },
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

async function login(email, password) {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  return response.ok && cookie ? cookie : null;
}

if (viewerEmail && viewerPassword) {
  const cookie = await login(viewerEmail, viewerPassword);
  if (!cookie) {
    failed = true;
    console.log("viewer login 000 FAIL");
  } else {
    const viewerExpectations = [
      { route: "/dashboards/plan-fact", status: 200 },
      { route: "/dashboards/forecast", status: 200 },
      { route: "/armenia", status: 200 },
      { route: "/tv/armenia", status: 200 },
      { route: "/admin/users", status: 403 },
      { route: "/admin/imports", status: 403 },
      { route: "/admin/metrics", status: 403 },
      { route: "/admin/data-sources", status: 403 },
      { route: "/admin/forecast-rules", status: 403 },
      { route: "/api/dashboards/plan-fact", status: 200 },
      { route: "/api/dashboards/armenia", status: 200 },
      { route: "/api/imports", status: 403 },
      { route: "/api/forecast", status: 200 },
    ];

    for (const expectation of viewerExpectations) {
      try {
        const response = await fetch(`${origin}${expectation.route}`, {
          headers: { Cookie: cookie },
          redirect: "manual",
        });
        const ok = response.status === expectation.status;
        if (!ok) failed = true;
        console.log(`viewer ${expectation.route} ${response.status} ${ok ? "OK" : "FAIL"}`);
      } catch (error) {
        failed = true;
        console.log(`viewer ${expectation.route} 000 FAIL ${error instanceof Error ? error.message : "Request failed"}`);
      }
    }
  }
}

if (failed) {
  process.exitCode = 1;
}
