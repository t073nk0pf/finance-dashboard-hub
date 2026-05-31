import { spawn } from "node:child_process";
import { buildDashboardUrl } from "../lib/dashboard/filters/urlState.ts";
import { validateDashboardFilters } from "../lib/dashboard/filters/validation.ts";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertArmeniaShape(body) {
  assert(isObject(body), "armenia response must be an object");
  assert(isObject(body.source), "armenia.source must be object");
  assert(isObject(body.period), "armenia.period must be object");
  assert(isObject(body.kpis), "armenia.kpis must be object");
  assert(Array.isArray(body.monthlySeries), "armenia.monthlySeries must be array");
  assert(Array.isArray(body.restaurants), "armenia.restaurants must be array");
  assert(Array.isArray(body.profitabilityDrivers), "armenia.profitabilityDrivers must be array");
  assert(isObject(body.growthReadiness), "armenia.growthReadiness must be object");
  assert(isObject(body.unitEconomics), "armenia.unitEconomics must be object");
}

function startDevServer(port, filtersEnabled, armeniaAdvancedEnabled) {
  return spawn("npm", ["run", "dev"], {
    env: {
      ...process.env,
      PORT: String(port),
      NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED: filtersEnabled ? "true" : "false",
      NEXT_PUBLIC_FORECAST_ADVANCED_FILTERS_ENABLED: "false",
      NEXT_PUBLIC_ARMENIA_ADVANCED_FILTERS_ENABLED: armeniaAdvancedEnabled ? "true" : "false",
      USE_ANALYTICS_ENGINE: "true",
      USE_DASHBOARD_TEMPLATE: "true",
    },
    stdio: "ignore",
    detached: true,
  });
}

function stopDevServer(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // already stopped
  }
}

async function waitForServer(baseUrl, timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status === 200 || response.status === 307) return;
    } catch {
      // retry
    }
    await delay(1000);
  }
  throw new Error(`server did not start in time: ${baseUrl}`);
}

async function login(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
    redirect: "manual",
  });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`auth cookie missing (status: ${response.status})`);
  return cookie;
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { redirect: "manual", ...init });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function checkMode(mode) {
  const port = mode.port;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port, mode.filtersEnabled, mode.armeniaAdvancedEnabled);
  try {
    await waitForServer(baseUrl);
    const cookie = await login(baseUrl);
    const headers = { Cookie: cookie };

    const page = await fetch(`${baseUrl}/armenia`, { headers, redirect: "manual" });
    assert(page.status === 200, `${mode.name}: /armenia should be 200`);

    const tvPage = await fetch(`${baseUrl}/tv/armenia`, { headers, redirect: "manual" });
    assert(tvPage.status === 200, `${mode.name}: /tv/armenia should be 200`);

    const pageWithQuery = await fetch(
      `${baseUrl}/armenia?country=armenia&from=2026-05-01&to=2026-05-31&aggregationMode=period&compareMode=plan`,
      { headers, redirect: "manual" },
    );
    assert(pageWithQuery.status === 200, `${mode.name}: /armenia with query should be 200`);

    const withQuery = await fetchJson(
      `${baseUrl}/api/dashboards/armenia?country=armenia&from=2026-05-01&to=2026-05-31&aggregationMode=period&compareMode=plan`,
      { headers },
    );
    assert(withQuery.response.status === 200, `${mode.name}: /api/dashboards/armenia query should be 200`);
    assertArmeniaShape(withQuery.body);

    const badQuery = await fetchJson(
      `${baseUrl}/api/dashboards/armenia?from=bad-date&aggregationMode=bad`,
      { headers },
    );
    assert(badQuery.response.status === 200, `${mode.name}: /api/dashboards/armenia bad query should still be 200`);
    assertArmeniaShape(badQuery.body);

    const advancedQuery = await fetchJson(
      `${baseUrl}/api/dashboards/armenia?country=armenia&from=2026-05-01&to=2026-05-31&groupBy=metric&metrics=revenue,ebitda&articles=food_cost,labor`,
      { headers },
    );
    assert(advancedQuery.response.status === 200, `${mode.name}: /api/dashboards/armenia advanced query should be 200`);
    assertArmeniaShape(advancedQuery.body);

    console.log(`OK  ${mode.name} armenia page/query and API query wiring`);
  } finally {
    stopDevServer(child);
    await delay(800);
  }
}

async function run() {
  const url = buildDashboardUrl("/armenia", {
    country: "armenia",
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
    aggregationMode: "period",
    compareMode: "plan",
  });
  assert(url.includes("country=armenia"), "buildDashboardUrl should include country");
  assert(url.includes("from=2026-05-01"), "buildDashboardUrl should include from");
  assert(url.includes("to=2026-05-31"), "buildDashboardUrl should include to");
  const advancedUrl = buildDashboardUrl("/armenia", {
    country: "armenia",
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
    groupBy: "metric",
    metrics: ["revenue", "ebitda"],
    articles: ["food_cost", "labor"],
  });
  assert(advancedUrl.includes("groupBy=metric"), "buildDashboardUrl should include groupBy");
  assert(advancedUrl.includes("metrics=ebitda%2Crevenue"), "buildDashboardUrl should include metrics CSV");
  assert(advancedUrl.includes("articles=food_cost%2Clabor"), "buildDashboardUrl should include articles CSV");
  console.log("OK  buildDashboardUrl for armenia");

  const validRange = validateDashboardFilters({
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
  });
  assert(validRange.isValid, "date validation should be valid when from <= to");

  const invalidRange = validateDashboardFilters({
    dateRange: { from: "2026-06-01", to: "2026-05-01" },
  });
  assert(!invalidRange.isValid, "date validation should be invalid when from > to");
  console.log("OK  armenia date validation helper");

  await checkMode({ name: "filters-disabled", filtersEnabled: false, armeniaAdvancedEnabled: false, port: 3140 });
  await checkMode({ name: "filters-enabled-advanced-disabled", filtersEnabled: true, armeniaAdvancedEnabled: false, port: 3141 });
  await checkMode({ name: "filters-enabled-advanced-enabled", filtersEnabled: true, armeniaAdvancedEnabled: true, port: 3142 });

  console.log("Armenia filter wiring checks passed.");
}

run().catch((error) => {
  console.error(`Armenia filter wiring checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
