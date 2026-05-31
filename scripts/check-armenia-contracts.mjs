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

async function waitForServer(baseUrl, timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status === 200 || response.status === 307) return;
    } catch {
      // ignore and retry
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
  if (!cookie) {
    throw new Error(`auth cookie is missing (status: ${response.status})`);
  }
  return cookie;
}

async function fetchArmenia(baseUrl, cookie, query) {
  const response = await fetch(`${baseUrl}/api/dashboards/armenia?${query}`, {
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

  const child = spawn("npm", ["run", "dev"], {
    env,
    stdio: "ignore",
    detached: true,
  });

  return child;
}

function stopDevServer(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // process may already be closed
  }
}

async function runModeCheck({ mode, useAnalyticsEngine, useDashboardTemplate, port }) {
  const child = startDevServer(port, useAnalyticsEngine, useDashboardTemplate);
  const baseUrl = `http://localhost:${port}`;

  try {
    await waitForServer(baseUrl);
    const cookie = await login(baseUrl);

    const seeded = await fetchArmenia(
      baseUrl,
      cookie,
      "country=armenia&from=2026-05-01&to=2026-05-31",
    );
    assert(seeded.response.status === 200, `${mode}: seeded period must return 200`);
    assertArmeniaShape(seeded.body);

    if (useAnalyticsEngine) {
      const outsideSeed = await fetchArmenia(
        baseUrl,
        cookie,
        "country=armenia&from=2024-01-01&to=2024-01-31",
      );
      assert(outsideSeed.response.status === 200, `${mode}: non-seed period must return 200`);
      assertArmeniaShape(outsideSeed.body);
    }

    console.log(`OK  ${mode}: /api/dashboards/armenia contract`);
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
    port: 3101,
  });

  await runModeCheck({
    mode: "USE_ANALYTICS_ENGINE=true / USE_DASHBOARD_TEMPLATE=false",
    useAnalyticsEngine: true,
    useDashboardTemplate: false,
    port: 3102,
  });

  await runModeCheck({
    mode: "USE_ANALYTICS_ENGINE=true / USE_DASHBOARD_TEMPLATE=true",
    useAnalyticsEngine: true,
    useDashboardTemplate: true,
    port: 3103,
  });

  console.log("Armenia dual-mode contract checks passed.");
}

run().catch((error) => {
  console.error(`Armenia contract checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
