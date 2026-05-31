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

function hasScenarioSet(body) {
  return (
    Array.isArray(body?.scenarios) &&
    body.scenarios.includes("pessimistic") &&
    body.scenarios.includes("base") &&
    body.scenarios.includes("optimistic")
  );
}

function assertForecastLegacyShape(body) {
  assert(isObject(body), "forecast response must be object");
  assert(Array.isArray(body.scenarios), "legacy forecast scenarios must be array");
  assert(typeof body.next === "string", "legacy forecast next must be string");
}

function assertForecastEngineShape(body) {
  assert(isObject(body), "forecast response must be object");
  assert(Array.isArray(body.scenarios), "forecast scenarios must be array");
  assert(Array.isArray(body.rows), "forecast rows must be array");
  assert(isObject(body.summary), "forecast summary must be object");
  assert(typeof body.generatedAt === "string", "forecast generatedAt must be string");
  assert(hasScenarioSet(body), "forecast scenarios must contain pessimistic/base/optimistic");
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

async function fetchForecast(baseUrl, cookie, query) {
  const response = await fetch(`${baseUrl}/api/forecast?${query}`, {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const body = await response.json();
  return { response, body };
}

function startDevServer(port, useAnalyticsEngine) {
  const env = {
    ...process.env,
    PORT: String(port),
    USE_ANALYTICS_ENGINE: useAnalyticsEngine ? "true" : "false",
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

async function runModeCheck({ mode, useAnalyticsEngine, port }) {
  const child = startDevServer(port, useAnalyticsEngine);
  const baseUrl = `http://localhost:${port}`;

  try {
    await waitForServer(baseUrl);
    const cookie = await login(baseUrl);

    const seeded = await fetchForecast(
      baseUrl,
      cookie,
      "country=armenia&from=2026-05-01&to=2026-05-31&asOfDate=2026-05-17&metrics=revenue,ebitda",
    );
    assert(seeded.response.status === 200, `${mode}: seeded period must return 200`);
    if (useAnalyticsEngine) {
      assertForecastEngineShape(seeded.body);
    } else {
      assertForecastLegacyShape(seeded.body);
    }

    if (useAnalyticsEngine) {
      const outsideSeed = await fetchForecast(
        baseUrl,
        cookie,
        "country=armenia&from=2024-01-01&to=2024-01-31&asOfDate=2024-01-17&metrics=revenue,ebitda",
      );
      assert(outsideSeed.response.status === 200, `${mode}: non-seed period must return 200`);
      // Non-seed period can return fallback legacy shape or engine-safe no_data shape.
      if (Array.isArray(outsideSeed.body?.rows)) {
        assertForecastEngineShape(outsideSeed.body);
      } else {
        assertForecastLegacyShape(outsideSeed.body);
      }
    }

    console.log(`OK  ${mode}: /api/forecast contract`);
  } finally {
    stopDevServer(child);
    await delay(800);
  }
}

async function run() {
  await runModeCheck({
    mode: "USE_ANALYTICS_ENGINE=false",
    useAnalyticsEngine: false,
    port: 3121,
  });

  await runModeCheck({
    mode: "USE_ANALYTICS_ENGINE=true",
    useAnalyticsEngine: true,
    port: 3122,
  });

  console.log("Forecast dual-mode contract checks passed.");
}

run().catch((error) => {
  console.error(`Forecast contract checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
