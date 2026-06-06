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

function startDevServer(port, filtersEnabled) {
  return spawn("npm", ["run", "dev"], {
    env: {
      ...process.env,
      PORT: String(port),
      NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED: filtersEnabled ? "true" : "false",
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

async function checkMode(mode) {
  const port = mode.filtersEnabled ? 3134 : 3133;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port, mode.filtersEnabled);
  try {
    await waitForServer(baseUrl);

    const unauthPage = await fetch(`${baseUrl}/dashboards/plan-fact`, { redirect: "manual" });
    assert([307, 200].includes(unauthPage.status), `plan-fact route unexpected status=${unauthPage.status} (mode=${mode.name})`);

    const unauthConfig = await fetch(`${baseUrl}/api/dashboard-filters/config`, { redirect: "manual" });
    assert(unauthConfig.status === 401, `config unauth expected 401, got ${unauthConfig.status} (mode=${mode.name})`);

    const cookie = await login(baseUrl);
    const page = await fetch(`${baseUrl}/dashboards/plan-fact`, { headers: { Cookie: cookie }, redirect: "manual" });
    assert(page.status === 200, `plan-fact auth expected 200, got ${page.status} (mode=${mode.name})`);

    const config = await fetch(`${baseUrl}/api/dashboard-filters/config?country=armenia`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    assert(config.status === 200, `config auth expected 200, got ${config.status} (mode=${mode.name})`);

    console.log(`OK  ${mode.name} /dashboards/plan-fact and /api/dashboard-filters/config`);
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
  console.log("OK  buildDashboardUrl helper");

  await checkMode({ name: "filters-disabled", filtersEnabled: false });
  await checkMode({ name: "filters-enabled", filtersEnabled: true });

  console.log("UI filter controls checks passed.");
}

run().catch((error) => {
  console.error(`UI filter controls checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
