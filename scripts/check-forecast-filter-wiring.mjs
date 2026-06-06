import { spawn } from "node:child_process";
import { buildDashboardUrl } from "../lib/dashboard/filters/urlState.ts";
import { normalizeForecastAdvancedFilters, validateDashboardFilters, validateForecastAdvancedFilters } from "../lib/dashboard/filters/validation.ts";
import { getPresetById } from "../lib/dashboard/filters/presets.ts";

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

function startDevServer(port, filtersEnabled, advancedEnabled) {
  return spawn("npm", ["run", "dev"], {
    env: {
      ...process.env,
      PORT: String(port),
      NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED: filtersEnabled ? "true" : "false",
      NEXT_PUBLIC_FORECAST_ADVANCED_FILTERS_ENABLED: advancedEnabled ? "true" : "false",
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

function assertForecastShape(body) {
  assert(isObject(body), "forecast response must be object");
  assert(Array.isArray(body.scenarios), "forecast scenarios must be array");
  if (body.rows !== undefined) assert(Array.isArray(body.rows), "forecast rows must be array if present");
}

async function checkMode(mode) {
  const port = mode.port;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port, mode.filtersEnabled, mode.advancedEnabled);
  try {
    await waitForServer(baseUrl);
    const cookie = await login(baseUrl);
    const headers = { Cookie: cookie };

    const page = await fetch(`${baseUrl}/dashboards/forecast`, { headers, redirect: "manual" });
    assert(page.status === 200, `${mode.name}: /dashboards/forecast should be 200`);

    const pageWithQuery = await fetch(
      `${baseUrl}/dashboards/forecast?country=armenia&from=2026-05-01&to=2026-05-31&aggregationMode=period&compareMode=plan`,
      { headers, redirect: "manual" },
    );
    assert(pageWithQuery.status === 200, `${mode.name}: /dashboards/forecast with query should be 200`);

    const withQuery = await fetchJson(
      `${baseUrl}/api/forecast?country=armenia&from=2026-05-01&to=2026-05-31&asOfDate=2026-05-17&metrics=revenue,ebitda`,
      { headers },
    );
    assert(withQuery.response.status === 200, `${mode.name}: /api/forecast with query should be 200`);
    assertForecastShape(withQuery.body);

    const badQuery = await fetchJson(`${baseUrl}/api/forecast?from=bad-date&aggregationMode=bad`, { headers });
    assert(badQuery.response.status === 200, `${mode.name}: /api/forecast with bad query should still be 200`);
    assertForecastShape(badQuery.body);

    const advancedQuery = await fetchJson(
      `${baseUrl}/api/forecast?country=armenia&from=2026-05-01&to=2026-05-31&asOfDate=2026-05-17&scenarios=base,optimistic&method=current_pace`,
      { headers },
    );
    assert(advancedQuery.response.status === 200, `${mode.name}: /api/forecast advanced params should be 200`);
    assertForecastShape(advancedQuery.body);

    const nonSeed = await fetchJson(
      `${baseUrl}/api/forecast?country=armenia&from=2024-01-01&to=2024-01-31&asOfDate=2024-01-17&scenarios=base&method=current_pace`,
      { headers },
    );
    assert(nonSeed.response.status === 200, `${mode.name}: /api/forecast non-seed period should be 200`);
    assertForecastShape(nonSeed.body);

    const basePresetUrl = buildDashboardUrl("/api/forecast", {
      country: "armenia",
      ...(getPresetById("forecastBaseCurrentMonth")?.filters ?? {}),
    });
    const optimisticPresetUrl = buildDashboardUrl("/api/forecast", {
      country: "armenia",
      ...(getPresetById("forecastOptimisticCurrentMonth")?.filters ?? {}),
    });
    const pessimisticPresetUrl = buildDashboardUrl("/api/forecast", {
      country: "armenia",
      ...(getPresetById("forecastPessimisticCurrentMonth")?.filters ?? {}),
    });

    const basePresetResponse = await fetchJson(`${baseUrl}${basePresetUrl}`, { headers });
    assert(basePresetResponse.response.status === 200, `${mode.name}: base preset forecast should be 200`);
    assertForecastShape(basePresetResponse.body);

    const optimisticPresetResponse = await fetchJson(`${baseUrl}${optimisticPresetUrl}`, { headers });
    assert(optimisticPresetResponse.response.status === 200, `${mode.name}: optimistic preset forecast should be 200`);
    assertForecastShape(optimisticPresetResponse.body);

    const pessimisticPresetResponse = await fetchJson(`${baseUrl}${pessimisticPresetUrl}`, { headers });
    assert(pessimisticPresetResponse.response.status === 200, `${mode.name}: pessimistic preset forecast should be 200`);
    assertForecastShape(pessimisticPresetResponse.body);

    const planFactPage = await fetch(`${baseUrl}/dashboards/plan-fact`, { headers, redirect: "manual" });
    assert(planFactPage.status === 200, `${mode.name}: /dashboards/plan-fact should remain 200`);

    console.log(`OK  ${mode.name} forecast page/query and API query wiring`);
  } finally {
    stopDevServer(child);
    await delay(800);
  }
}

async function run() {
  const url = buildDashboardUrl("/dashboards/forecast", {
    country: "armenia",
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
    aggregationMode: "period",
    compareMode: "plan",
  });
  assert(url.includes("country=armenia"), "buildDashboardUrl should include country");
  assert(url.includes("from=2026-05-01"), "buildDashboardUrl should include from");
  assert(url.includes("to=2026-05-31"), "buildDashboardUrl should include to");
  const advancedUrl = buildDashboardUrl("/dashboards/forecast", {
    country: "armenia",
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
    asOfDate: "2026-05-17",
    scenarios: ["base", "optimistic"],
    method: "current_pace",
  });
  assert(advancedUrl.includes("asOfDate=2026-05-17"), "buildDashboardUrl should include asOfDate");
  assert(advancedUrl.includes("scenarios=base%2Coptimistic"), "buildDashboardUrl should include scenarios CSV");
  assert(advancedUrl.includes("method=current_pace"), "buildDashboardUrl should include method");
  console.log("OK  buildDashboardUrl for forecast");

  const validRange = validateDashboardFilters({
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
  });
  assert(validRange.isValid, "date validation should be valid when from <= to");
  console.log("OK  forecast filter validation helper");

  const invalidAsOf = validateForecastAdvancedFilters({
    asOfDate: "2026-99-99",
    scenarios: ["base"],
    method: "current_pace",
  });
  assert(!invalidAsOf.isValid, "advanced validation should fail for invalid asOfDate");

  const duplicateScenarios = normalizeForecastAdvancedFilters({
    scenarios: ["base", "base", "optimistic"],
  });
  assert(
    (duplicateScenarios.scenarios ?? []).join(",") === "base,optimistic",
    "scenario normalization should dedupe scenarios",
  );

  const invalidScenario = validateForecastAdvancedFilters({
    scenarios: ["base", "bad"],
    method: "current_pace",
  });
  assert(invalidScenario.warnings.length > 0, "advanced validation should warn for invalid scenario");

  const invalidMethod = validateForecastAdvancedFilters({
    method: "bad",
  });
  assert(!invalidMethod.isValid, "advanced validation should fail for invalid method");

  const basePreset = getPresetById("forecastBaseCurrentMonth");
  assert(basePreset, "forecastBaseCurrentMonth preset should exist");
  assert(basePreset.filters.method === "current_pace", "base preset method should be current_pace");
  assert((basePreset.filters.scenarios ?? []).join(",") === "base", "base preset scenario should be base");

  const optimisticPreset = getPresetById("forecastOptimisticCurrentMonth");
  assert(optimisticPreset, "forecastOptimisticCurrentMonth preset should exist");
  assert((optimisticPreset.filters.scenarios ?? []).join(",") === "optimistic", "optimistic preset scenario should be optimistic");

  const pessimisticPreset = getPresetById("forecastPessimisticCurrentMonth");
  assert(pessimisticPreset, "forecastPessimisticCurrentMonth preset should exist");
  assert((pessimisticPreset.filters.scenarios ?? []).join(",") === "pessimistic", "pessimistic preset scenario should be pessimistic");
  console.log("OK  forecast advanced validation/normalization helper");

  await checkMode({ name: "filters-disabled", filtersEnabled: false, advancedEnabled: false, port: 3137 });
  await checkMode({ name: "filters-enabled-advanced-disabled", filtersEnabled: true, advancedEnabled: false, port: 3138 });
  await checkMode({ name: "filters-enabled-advanced-enabled", filtersEnabled: true, advancedEnabled: true, port: 3139 });

  console.log("Forecast filter wiring checks passed.");
}

run().catch((error) => {
  console.error(`Forecast filter wiring checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
