import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { spawn } from "node:child_process";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin";
const VIEWER_EMAIL = process.env.VIEWER_EMAIL ?? "viewer@example.com";
const VIEWER_PASSWORD = process.env.VIEWER_PASSWORD ?? "viewer12345";

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
      NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED: "false",
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

async function ensureViewerUser() {
  const passwordHash = await bcrypt.hash(VIEWER_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: VIEWER_EMAIL },
    update: {
      role: UserRole.VIEWER,
      active: true,
      passwordHash,
      name: "Viewer Test User",
    },
    create: {
      email: VIEWER_EMAIL,
      role: UserRole.VIEWER,
      active: true,
      passwordHash,
      name: "Viewer Test User",
    },
  });
}

async function login(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error(`auth cookie missing for ${email} (status: ${response.status})`);
  return cookie;
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { redirect: "manual", ...init });
  const body = await response.json().catch(() => null);
  return { response, body };
}

function assertPreviewShape(body) {
  assert(isObject(body), "preview response must be object");
  assert(Array.isArray(body.rowsPreview), "rowsPreview must be array");
  assert(Array.isArray(body.errors), "errors must be array");
  assert(isObject(body.summary), "summary must be object");
  assert(isObject(body.meta), "meta must be object");
  assert(body.meta.persisted === false, "meta.persisted must be false");
}

async function run() {
  await ensureViewerUser();

  const port = 3154;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port);

  try {
    await waitForServer(baseUrl);

    const unauthPage = await fetch(`${baseUrl}/admin/imports`, { redirect: "manual" });
    assert([307, 308].includes(unauthPage.status), "unauth /admin/imports must redirect");

    const unauthPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType: "manual", rows: [] }),
    });
    assert(unauthPreview.response.status === 401, "unauth preview API must be 401");

    const viewerCookie = await login(baseUrl, VIEWER_EMAIL, VIEWER_PASSWORD);
    const viewerPage = await fetch(`${baseUrl}/admin/imports`, {
      headers: { Cookie: viewerCookie },
      redirect: "manual",
    });
    assert(viewerPage.status === 403, "viewer /admin/imports must be forbidden");

    const viewerPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: viewerCookie,
      },
      body: JSON.stringify({ sourceType: "manual", rows: [] }),
    });
    assert(viewerPreview.response.status === 403, "viewer preview API must be 403");

    const adminCookie = await login(baseUrl, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminHeaders = {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    };

    const adminPage = await fetch(`${baseUrl}/admin/imports`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    assert(adminPage.status === 200, "admin /admin/imports must be 200");
    const adminHtml = await adminPage.text();
    assert(adminHtml.includes("Import preview"), "admin /admin/imports must render preview UI");
    assert(adminHtml.includes("Preview only"), "admin /admin/imports must render preview-only state");

    const validPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: "2026-05-01", unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 100000 },
        ],
      }),
    });
    assert(validPreview.response.status === 200, "valid preview API call must be 200");
    assertPreviewShape(validPreview.body);

    const invalidPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: "bad-date", unit: "Yerevan-1", metricKey: "unknown_metric", valueType: "bad", value: null },
        ],
      }),
    });
    assert(invalidPreview.response.status === 200, "invalid preview API call must be controlled 200");
    assertPreviewShape(invalidPreview.body);
    assert(invalidPreview.body.summary.invalidRows > 0, "invalid preview must include invalid rows");

    const badPayload = await fetch(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: "{bad json",
      redirect: "manual",
    });
    assert(badPayload.status === 400, "bad JSON preview API call must be 400");

    const adminDataSources = await fetch(`${baseUrl}/admin/data-sources`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    const adminUsers = await fetch(`${baseUrl}/admin/users`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    const adminMetrics = await fetch(`${baseUrl}/admin/metrics`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    assert(adminDataSources.status === 200, "/admin/data-sources must remain 200");
    assert(adminUsers.status === 200, "/admin/users must remain 200");
    assert(adminMetrics.status === 200, "/admin/metrics must remain 200");

    console.log("Import preview UI checks passed.");
  } finally {
    stopDevServer(child);
    await delay(800);
    await prisma.$disconnect();
  }
}

run().catch(async (error) => {
  console.error(`Import preview UI checks failed: ${error instanceof Error ? error.message : String(error)}`);
  await prisma.$disconnect();
  process.exit(1);
});
