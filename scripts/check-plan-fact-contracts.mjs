import { spawn } from "node:child_process";

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

function assertPlanFactDashboardShape(body) {
  assert(isObject(body), "plan-fact dashboard response must be object");
  assert(Array.isArray(body.months), "months must be array");
  assert(isObject(body.metrics), "metrics must be object");
  assert(Array.isArray(body.mainArticles), "mainArticles must be array");
  assert(isObject(body.expenseVariance), "expenseVariance must be object");
  assert(Array.isArray(body.entities), "entities must be array");
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

async function fetchPlanFact(baseUrl, cookie, query) {
  const response = await fetch(`${baseUrl}/api/dashboards/plan-fact?${query}`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const body = await response.json();
  return { response, body };
}

function startDevServer(port, useAnalyticsEngine, useDashboardTemplate) {
  const env = {
    ...process.env,
    PORT: String(port),
    USE_ANALYTICS_ENGINE: useAnalyticsEngine ? "true" : "false",
    USE_DASHBOARD_TEMPLATE: useDashboardTemplate ? "true" : "false",
  };

  return spawn("npm", ["run", "dev"], {
    env,
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

async function runModeCheck({ mode, useAnalyticsEngine, useDashboardTemplate, port }) {
  const child = startDevServer(port, useAnalyticsEngine, useDashboardTemplate);
  const baseUrl = `http://localhost:${port}`;

  try {
    await waitForServer(baseUrl);
    const cookie = await login(baseUrl);

    const seeded = await fetchPlanFact(
      baseUrl,
      cookie,
      "country=armenia&from=2026-05-01&to=2026-05-31&groupBy=metric",
    );
    assert(seeded.response.status === 200, `${mode}: seeded period must return 200`);
    assertPlanFactDashboardShape(seeded.body);

    if (useAnalyticsEngine) {
      const outsideSeed = await fetchPlanFact(
        baseUrl,
        cookie,
        "country=armenia&from=2024-01-01&to=2024-01-31&groupBy=metric",
      );
      assert(outsideSeed.response.status === 200, `${mode}: non-seed period must return 200`);
      assertPlanFactDashboardShape(outsideSeed.body);
    }

    console.log(`OK  ${mode}: /api/dashboards/plan-fact contract`);
  } finally {
    stopDevServer(child);
    await delay(800);
  }
}

async function run() {
  await runModeCheck({
    mode: "USE_ANALYTICS_ENGINE=false / USE_DASHBOARD_TEMPLATE=false",
    useAnalyticsEngine: false,
    useDashboardTemplate: false,
    port: 3111,
  });

  await runModeCheck({
    mode: "USE_ANALYTICS_ENGINE=true / USE_DASHBOARD_TEMPLATE=false",
    useAnalyticsEngine: true,
    useDashboardTemplate: false,
    port: 3112,
  });

  await runModeCheck({
    mode: "USE_ANALYTICS_ENGINE=true / USE_DASHBOARD_TEMPLATE=true",
    useAnalyticsEngine: true,
    useDashboardTemplate: true,
    port: 3113,
  });

  console.log("Plan-fact dual-mode contract checks passed.");
}

run().catch((error) => {
  console.error(`Plan-fact contract checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
