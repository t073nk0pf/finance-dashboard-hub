import { spawn } from "node:child_process";
import { buildDashboardUrl } from "../lib/dashboard/filters/urlState.ts";

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

function startDevServer(port, filtersEnabled) {
  return spawn("npm", ["run", "dev"], {
    env: {
      ...process.env,
      PORT: String(port),
      NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED: filtersEnabled ? "true" : "false",
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

function assertPlanFactShape(body) {
  assert(isObject(body), "plan-fact response must be object");
  assert(Array.isArray(body.months), "plan-fact response months must be array");
  assert(isObject(body.metrics), "plan-fact response metrics must be object");
  assert(Array.isArray(body.mainArticles), "plan-fact response mainArticles must be array");
  assert(isObject(body.expenseVariance), "plan-fact response expenseVariance must be object");
  assert(Array.isArray(body.entities), "plan-fact response entities must be array");
}

async function checkMode(mode) {
  const port = mode.filtersEnabled ? 3136 : 3135;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port, mode.filtersEnabled);

  try {
    await waitForServer(baseUrl);
    const cookie = await login(baseUrl);
    const headers = { Cookie: cookie };

    const page = await fetch(`${baseUrl}/dashboards/plan-fact`, { headers, redirect: "manual" });
    assert(page.status === 200, `${mode.name}: /dashboards/plan-fact should be 200`);

    const withQuery = await fetchJson(
      `${baseUrl}/api/dashboards/plan-fact?country=armenia&from=2026-05-01&to=2026-05-31&aggregationMode=period&compareMode=plan`,
      { headers },
    );
    assert(withQuery.response.status === 200, `${mode.name}: query plan-fact should be 200`);
    assertPlanFactShape(withQuery.body);

    const badQuery = await fetchJson(
      `${baseUrl}/api/dashboards/plan-fact?from=bad-date&aggregationMode=bad`,
      { headers },
    );
    assert(badQuery.response.status === 200, `${mode.name}: bad query should still be 200`);
    assertPlanFactShape(badQuery.body);

    console.log(`OK  ${mode.name} plan-fact page and API query wiring`);
  } finally {
    stopDevServer(child);
    await delay(800);
  }
}

async function run() {
  const url = buildDashboardUrl("/dashboards/plan-fact", {
    country: "armenia",
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
    aggregationMode: "period",
    compareMode: "plan",
  });
  assert(url.includes("country=armenia"), "buildDashboardUrl should include country");
  assert(url.includes("from=2026-05-01"), "buildDashboardUrl should include from");
  assert(url.includes("to=2026-05-31"), "buildDashboardUrl should include to");
  console.log("OK  buildDashboardUrl for plan-fact");

  await checkMode({ name: "filters-disabled", filtersEnabled: false });
  await checkMode({ name: "filters-enabled", filtersEnabled: true });

  console.log("Plan-fact filter wiring checks passed.");
}

run().catch((error) => {
  console.error(`Plan-fact filter wiring checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
