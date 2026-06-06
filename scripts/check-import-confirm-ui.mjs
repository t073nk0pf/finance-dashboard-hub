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

async function getCounts() {
  const [importBatches, analyticsFacts] = await Promise.all([
    prisma.importBatch.count(),
    prisma.analyticsFact.count(),
  ]);
  return { importBatches, analyticsFacts };
}

function assertPreviewShape(body) {
  assert(isObject(body), "preview response must be object");
  assert(Array.isArray(body.rowsPreview), "preview rowsPreview must be array");
  assert(isObject(body.summary), "preview summary must be object");
  assert(isObject(body.meta), "preview meta must be object");
  assert(body.meta.persisted === false, "preview meta.persisted must be false");
}

function assertConfirmShape(body) {
  assert(isObject(body), "confirm response must be object");
  assert("importBatch" in body, "confirm response must include importBatch");
  assert(Array.isArray(body.savedFacts), "confirm savedFacts must be array");
  assert(isObject(body.summary), "confirm summary must be object");
  assert(isObject(body.meta), "confirm meta must be object");
}

async function run() {
  await ensureViewerUser();

  const port = 3158;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port);

  try {
    await waitForServer(baseUrl);

    const unauthPage = await fetch(`${baseUrl}/admin/imports`, { redirect: "manual" });
    assert([307, 308].includes(unauthPage.status), "unauth /admin/imports must redirect");

    const viewerCookie = await login(baseUrl, VIEWER_EMAIL, VIEWER_PASSWORD);
    const viewerPage = await fetch(`${baseUrl}/admin/imports`, {
      headers: { Cookie: viewerCookie },
      redirect: "manual",
    });
    assert(viewerPage.status === 403, "viewer /admin/imports must be forbidden");

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
    assert(adminHtml.includes("Import preview"), "admin /admin/imports must render imports UI");

    const validDate = "2099-01-16";
    const idempotencyKey = `check-import-confirm-ui-${Date.now()}`;

    const validPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: validDate, unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 100000 },
        ],
      }),
    });
    assert(validPreview.response.status === 200, "valid preview must be 200");
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
    assert(invalidPreview.response.status === 200, "invalid preview must be controlled 200");
    assertPreviewShape(invalidPreview.body);
    assert(invalidPreview.body.summary.invalidRows > 0, "invalid preview must include invalid rows");

    const countsBeforeConfirm = await getCounts();
    const validConfirm = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: validDate, unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 100000 },
        ],
        idempotencyKey,
      }),
    });
    assert(validConfirm.response.status === 200, "valid confirm must be 200");
    assertConfirmShape(validConfirm.body);
    assert(validConfirm.body.meta.persisted === true, "valid confirm must persist");
    assert(validConfirm.body.importBatch, "valid confirm must return importBatch");

    const countsAfterConfirm = await getCounts();
    assert(countsAfterConfirm.importBatches === countsBeforeConfirm.importBatches + 1, "valid confirm must create import batch");
    assert(countsAfterConfirm.analyticsFacts >= countsBeforeConfirm.analyticsFacts + 1, "valid confirm must create analytics fact");

    const duplicateConfirm = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: validDate, unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 100000 },
        ],
        idempotencyKey,
      }),
    });
    assert(duplicateConfirm.response.status === 200, "duplicate confirm must be 200");
    assertConfirmShape(duplicateConfirm.body);
    assert(duplicateConfirm.body.meta.duplicate === true, "duplicate confirm must set duplicate=true");

    const countsAfterDuplicate = await getCounts();
    assert(countsAfterDuplicate.importBatches === countsAfterConfirm.importBatches, "duplicate confirm must not create second batch");
    assert(countsAfterDuplicate.analyticsFacts === countsAfterConfirm.analyticsFacts, "duplicate confirm must not create second fact");

    const invalidConfirm = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: "bad-date", unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 100000 },
        ],
        idempotencyKey: `invalid-${Date.now()}`,
      }),
    });
    assert(invalidConfirm.response.status === 422, "invalid confirm must be rejected with 422");
    assertConfirmShape(invalidConfirm.body);
    assert(invalidConfirm.body.meta.rejected === true, "invalid confirm must mark rejected");

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

    console.log("Import confirm UI checks passed.");
  } finally {
    stopDevServer(child);
    await delay(800);
    await prisma.$disconnect();
  }
}

run().catch(async (error) => {
  console.error(`Import confirm UI checks failed: ${error instanceof Error ? error.message : String(error)}`);
  await prisma.$disconnect();
  process.exit(1);
});
