const BASE_URL = process.env.BASE_URL;

function fail(message) {
  throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function fetchJson(url, init) {
  const response = await fetch(url, { redirect: "manual", ...init });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

async function getAuthCookie(baseUrl) {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin";

  const { response } = await fetchJson(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const setCookie = response.headers.get("set-cookie");
  return setCookie ? setCookie.split(";")[0] : null;
}

function assertPlanFactShape(body) {
  if (!isObject(body)) fail("plan-fact response must be object");
  if (!Array.isArray(body.rows)) fail("plan-fact rows must be array");
  if (!isObject(body.summary)) fail("plan-fact summary must be object");
  if (typeof body.generatedAt !== "string") fail("plan-fact generatedAt must be string");
}

function assertForecastShape(body) {
  if (!isObject(body)) fail("forecast response must be object");
  if (!Array.isArray(body.rows)) fail("forecast rows must be array");
  if (!Array.isArray(body.scenarios)) fail("forecast scenarios must be array");
  if (!isObject(body.summary)) fail("forecast summary must be object");
  if (typeof body.generatedAt !== "string") fail("forecast generatedAt must be string");
  for (const scenario of ["pessimistic", "base", "optimistic"]) {
    if (!body.scenarios.includes(scenario)) fail(`forecast scenarios missing ${scenario}`);
  }
}

function assertArmeniaShape(body) {
  if (!isObject(body)) fail("armenia response must be object");
  if (!isObject(body.kpis)) fail("armenia kpis must be object");
  if (!Array.isArray(body.monthlySeries)) fail("armenia monthlySeries must be array");
  if (!Array.isArray(body.restaurants)) fail("armenia restaurants must be array");
  if (!Array.isArray(body.profitabilityDrivers)) fail("armenia profitabilityDrivers must be array");
}

async function run() {
  if (!BASE_URL) {
    console.log("SKIP check-api-contracts: set BASE_URL to run API checks.");
    return;
  }

  const unauth = await fetch(`${BASE_URL}/api/analytics/plan-fact?country=armenia&from=2026-05-01&to=2026-05-31`, {
    redirect: "manual",
  });
  if (![401, 307].includes(unauth.status)) {
    fail(`expected unauth 401/307, got ${unauth.status}`);
  }
  console.log(`OK  unauth protected status=${unauth.status}`);

  const cookie = await getAuthCookie(BASE_URL);
  if (!cookie) {
    console.log("SKIP authenticated contract checks: admin login cookie not available.");
    return;
  }

  const headers = { Cookie: cookie };

  const planFact = await fetchJson(
    `${BASE_URL}/api/analytics/plan-fact?country=armenia&from=2026-05-01&to=2026-05-31&groupBy=metric`,
    { headers },
  );
  if (planFact.response.status !== 200) fail(`/api/analytics/plan-fact status ${planFact.response.status}`);
  assertPlanFactShape(planFact.body);
  if (planFact.body.rows.length === 0) fail("/api/analytics/plan-fact rows should be non-empty for seeded data");
  console.log("OK  analytics/plan-fact contract");

  const forecast = await fetchJson(
    `${BASE_URL}/api/analytics/forecast?country=armenia&from=2026-05-01&to=2026-05-31&asOfDate=2026-05-17&metrics=revenue,ebitda`,
    { headers },
  );
  if (forecast.response.status !== 200) fail(`/api/analytics/forecast status ${forecast.response.status}`);
  assertForecastShape(forecast.body);
  if (forecast.body.rows.length === 0) fail("/api/analytics/forecast rows should be non-empty for seeded data");
  console.log("OK  analytics/forecast contract");

  const dashboardPlanFact = await fetchJson(
    `${BASE_URL}/api/dashboards/plan-fact?country=armenia&from=2026-05-01&to=2026-05-31`,
    { headers },
  );
  if (dashboardPlanFact.response.status !== 200) fail(`/api/dashboards/plan-fact status ${dashboardPlanFact.response.status}`);
  if (!isObject(dashboardPlanFact.body)) fail("dashboard plan-fact response must be object");
  const hasLegacyShape =
    Array.isArray(dashboardPlanFact.body?.kpiCards) ||
    isObject(dashboardPlanFact.body?.summary) ||
    isObject(dashboardPlanFact.body?.metrics);
  if (!hasLegacyShape) fail("dashboard plan-fact response shape mismatch");
  console.log("OK  dashboards/plan-fact compatibility");

  const legacyForecast = await fetchJson(
    `${BASE_URL}/api/forecast?country=armenia&from=2026-05-01&to=2026-05-31&asOfDate=2026-05-17`,
    { headers },
  );
  if (legacyForecast.response.status !== 200) fail(`/api/forecast status ${legacyForecast.response.status}`);
  if (!isObject(legacyForecast.body)) fail("legacy forecast response must be object");
  const hasForecastShape = Array.isArray(legacyForecast.body.rows) && Array.isArray(legacyForecast.body.scenarios);
  const hasLegacyPlaceholderShape = Array.isArray(legacyForecast.body.scenarios) && typeof legacyForecast.body.next === "string";
  if (!hasForecastShape && !hasLegacyPlaceholderShape) fail("legacy forecast response shape mismatch");
  console.log("OK  forecast compatibility");

  const armeniaDashboard = await fetchJson(
    `${BASE_URL}/api/dashboards/armenia?from=2026-05-01&to=2026-05-31&groupBy=metric`,
    { headers },
  );
  if (armeniaDashboard.response.status !== 200) fail(`/api/dashboards/armenia status ${armeniaDashboard.response.status}`);
  assertArmeniaShape(armeniaDashboard.body);
  console.log("OK  dashboards/armenia compatibility");

  console.log("API contract checks passed.");
}

run().catch((error) => {
  console.error(`API contract checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
