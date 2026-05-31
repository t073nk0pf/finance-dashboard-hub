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

function startDevServer(port) {
  return spawn("npm", ["run", "dev"], {
    env: {
      ...process.env,
      PORT: String(port),
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

function assertConfigShape(body) {
  assert(isObject(body), "response must be object");
  assert(isObject(body.filters), "filters must be object");
  assert(isObject(body.config), "config must be object");
  assert(Array.isArray(body.presets), "presets must be array");
  assert(Array.isArray(body.supportedParams), "supportedParams must be array");
  assert(isObject(body.meta), "meta must be object");
  assert(typeof body.meta.generatedAt === "string", "meta.generatedAt must be string");
  assert(body.meta.source === "dashboard_filter_config", "meta.source must be dashboard_filter_config");
  assert(Array.isArray(body.meta.warnings), "meta.warnings must be array");
  assert(typeof body.meta.dynamicOptions === "boolean", "meta.dynamicOptions must be boolean");
  assert(Array.isArray(body.config.regions), "config.regions must be array");
  assert(Array.isArray(body.config.units), "config.units must be array");
}

function assertOptionsShape(options, label) {
  for (const option of options) {
    assert(typeof option.value === "string", `${label} option.value must be string`);
    assert(typeof option.label === "string", `${label} option.label must be string`);
  }
}

async function run() {
  const port = 3132;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port);

  try {
    await waitForServer(baseUrl);

    const unauth = await fetch(`${baseUrl}/api/dashboard-filters/config`, {
      redirect: "manual",
    });
    assert(unauth.status === 401, `unauth expected 401, got ${unauth.status}`);
    console.log("OK  unauth /api/dashboard-filters/config");

    const cookie = await login(baseUrl);
    const headers = { Cookie: cookie };

    const ok = await fetchJson(
      `${baseUrl}/api/dashboard-filters/config?country=armenia&from=2026-05-01&to=2026-05-31&aggregationMode=period&compareMode=plan`,
      { headers },
    );
    assert(ok.response.status === 200, `expected 200, got ${ok.response.status}`);
    assertConfigShape(ok.body);
    assertOptionsShape(ok.body.config.regions, "regions");
    assertOptionsShape(ok.body.config.units, "units");
    console.log("OK  dashboard-filters/config normal params");

    const countryScoped = await fetchJson(`${baseUrl}/api/dashboard-filters/config?country=armenia`, { headers });
    assert(countryScoped.response.status === 200, `country scoped expected 200, got ${countryScoped.response.status}`);
    assertConfigShape(countryScoped.body);
    assert(countryScoped.body.config.units.length > 0, "country scoped units should exist");
    console.log("OK  dashboard-filters/config country scoped options");

    const regionScoped = await fetchJson(`${baseUrl}/api/dashboard-filters/config?country=armenia&region=Yerevan`, { headers });
    assert(regionScoped.response.status === 200, `region scoped expected 200, got ${regionScoped.response.status}`);
    assertConfigShape(regionScoped.body);
    assert(regionScoped.body.config.units.length > 0, "region scoped units should exist");
    console.log("OK  dashboard-filters/config region scoped options");

    const bad = await fetchJson(`${baseUrl}/api/dashboard-filters/config?from=bad-date&aggregationMode=bad`, { headers });
    assert(bad.response.status === 200, `bad params expected 200, got ${bad.response.status}`);
    assertConfigShape(bad.body);
    assert(bad.body.meta.warnings.length > 0, "bad params should return warnings");
    console.log("OK  dashboard-filters/config bad params warnings");

    console.log("Dashboard filter config API checks passed.");
  } finally {
    stopDevServer(child);
    await delay(800);
  }
}

run().catch((error) => {
  console.error(`Dashboard filter config API checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
