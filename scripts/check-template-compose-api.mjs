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

function assertComposeShape(body) {
  assert(isObject(body), "compose response must be object");
  assert(isObject(body.template), "template must be object");
  assert(isObject(body.filters), "filters must be object");
  assert(isObject(body.data), "data must be object");
  assert(isObject(body.meta), "meta must be object");
  assert(typeof body.meta.generatedAt === "string", "meta.generatedAt must be string");
  assert(body.meta.source === "template_composer", "meta.source must be template_composer");
  assert(Array.isArray(body.meta.warnings), "meta.warnings must be array");
}

async function run() {
  const port = 3131;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port);

  try {
    await waitForServer(baseUrl);

    const unauth = await fetch(`${baseUrl}/api/dashboard-template/compose?templateId=armenia`, {
      redirect: "manual",
    });
    assert(unauth.status === 401, `unauth expected 401, got ${unauth.status}`);
    console.log("OK  unauth /api/dashboard-template/compose");

    const cookie = await login(baseUrl);
    const headers = { Cookie: cookie };

    const armenia = await fetchJson(
      `${baseUrl}/api/dashboard-template/compose?templateId=armenia&country=armenia&from=2026-05-01&to=2026-05-31`,
      { headers },
    );
    assert(armenia.response.status === 200, `armenia template expected 200, got ${armenia.response.status}`);
    assertComposeShape(armenia.body);
    console.log("OK  template compose armenia");

    const planFact = await fetchJson(
      `${baseUrl}/api/dashboard-template/compose?templateId=plan-fact&country=armenia&from=2026-05-01&to=2026-05-31&groupBy=metric`,
      { headers },
    );
    assert(planFact.response.status === 200, `plan-fact template expected 200, got ${planFact.response.status}`);
    assertComposeShape(planFact.body);
    console.log("OK  template compose plan-fact");

    const forecast = await fetchJson(
      `${baseUrl}/api/dashboard-template/compose?templateId=forecast&country=armenia&from=2026-05-01&to=2026-05-31&asOfDate=2026-05-17`,
      { headers },
    );
    assert(forecast.response.status === 200, `forecast template expected 200, got ${forecast.response.status}`);
    assertComposeShape(forecast.body);
    console.log("OK  template compose forecast");

    const unknown = await fetchJson(`${baseUrl}/api/dashboard-template/compose?templateId=unknown-template`, { headers });
    assert(unknown.response.status === 400, `unknown template expected 400, got ${unknown.response.status}`);
    assert(unknown.body?.error === "unknown_template", "unknown template error code mismatch");
    assert(Array.isArray(unknown.body?.availableTemplates), "unknown template list is required");
    console.log("OK  template compose unknown template");

    console.log("Template compose API checks passed.");
  } finally {
    stopDevServer(child);
    await delay(800);
  }
}

run().catch((error) => {
  console.error(`Template compose API checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
