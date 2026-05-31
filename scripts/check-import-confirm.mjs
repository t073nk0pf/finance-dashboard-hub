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

function assertConfirmShape(body) {
  assert(isObject(body), "confirm response must be object");
  assert("importBatch" in body, "confirm response must include importBatch");
  assert(Array.isArray(body.savedFacts), "confirm response must include savedFacts array");
  assert(Array.isArray(body.errors), "confirm response must include errors array");
  assert(isObject(body.summary), "confirm response must include summary");
  assert(isObject(body.meta), "confirm response must include meta");
}

async function run() {
  await ensureViewerUser();

  const port = 3156;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port);

  try {
    await waitForServer(baseUrl);

    const timestamp = Date.now();
    const validDate = "2099-01-15";
    const validIdempotencyKey = `check-import-confirm-${timestamp}`;

    const previewPayload = {
      sourceType: "manual",
      rows: [
        { date: validDate, unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 111111 },
      ],
    };

    const unauth = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(previewPayload),
    });
    assert(unauth.response.status === 401, "unauth confirm must be 401");

    const viewerCookie = await login(baseUrl, VIEWER_EMAIL, VIEWER_PASSWORD);
    const viewer = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: viewerCookie,
      },
      body: JSON.stringify(previewPayload),
    });
    assert(viewer.response.status === 403, "viewer confirm must be 403");

    const adminCookie = await login(baseUrl, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminHeaders = {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    };

    const countsBeforePreview = await getCounts();
    const preview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(previewPayload),
    });
    assert(preview.response.status === 200, "preview must stay 200");
    const countsAfterPreview = await getCounts();
    assert(countsAfterPreview.importBatches === countsBeforePreview.importBatches, "preview must not create import batches");
    assert(countsAfterPreview.analyticsFacts === countsBeforePreview.analyticsFacts, "preview must not create analytics facts");

    const countsBeforeInvalid = await getCounts();
    const invalid = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: "bad-date", unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 100000 },
          { date: validDate, unit: "Yerevan-1", metricKey: "unknown_metric", valueType: "fact", value: 100000 },
          { date: validDate, unit: "Yerevan-1", metricKey: "revenue", valueType: "fact" },
        ],
        idempotencyKey: `invalid-${timestamp}`,
      }),
    });
    assert(invalid.response.status === 422, "invalid confirm must be rejected with 422");
    assertConfirmShape(invalid.body);
    assert(invalid.body.meta.persisted === false, "invalid confirm must not persist");
    assert(invalid.body.meta.rejected === true, "invalid confirm must be rejected");
    const countsAfterInvalid = await getCounts();
    assert(countsAfterInvalid.importBatches === countsBeforeInvalid.importBatches, "invalid confirm must not create import batches");
    assert(countsAfterInvalid.analyticsFacts === countsBeforeInvalid.analyticsFacts, "invalid confirm must not create analytics facts");

    const emptyRows = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ sourceType: "manual", rows: [] }),
    });
    assert([400, 422].includes(emptyRows.response.status), "empty rows confirm must be controlled");

    const tooManyRows = Array.from({ length: 501 }, (_, index) => ({
      date: validDate,
      unit: "Yerevan-1",
      metricKey: "revenue",
      valueType: "fact",
      value: 100000 + index,
    }));
    const tooMany = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ sourceType: "manual", rows: tooManyRows }),
    });
    assert(tooMany.response.status === 400, "too many rows confirm must be 400");

    const countsBeforeValid = await getCounts();
    const valid = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: validDate, unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 123456 },
          { date: validDate, unit: "Yerevan-1", metricKey: "ebitda", valueType: "fact", value: 22222 },
        ],
        idempotencyKey: validIdempotencyKey,
      }),
    });
    assert(valid.response.status === 200, "valid confirm must be 200");
    assertConfirmShape(valid.body);
    assert(valid.body.meta.persisted === true, "valid confirm must persist");
    assert(valid.body.meta.rejected === false, "valid confirm must not be rejected");
    assert(valid.body.importBatch && typeof valid.body.importBatch.id === "string", "valid confirm must create import batch");
    assert(valid.body.savedFacts.length > 0, "valid confirm must save facts");

    const countsAfterValid = await getCounts();
    assert(countsAfterValid.importBatches === countsBeforeValid.importBatches + 1, "valid confirm must create one import batch");
    assert(countsAfterValid.analyticsFacts >= countsBeforeValid.analyticsFacts + 2, "valid confirm must create analytics facts");

    const savedBatch = await prisma.importBatch.findFirst({
      where: {
        source: `import_confirm:${validIdempotencyKey}`,
      },
      include: {
        analyticsFacts: true,
      },
      orderBy: {
        startedAt: "desc",
      },
    });
    assert(savedBatch, "saved batch must be queryable");
    assert(savedBatch.status === "COMPLETED", "saved batch must be completed");
    assert(savedBatch.rowsFailed === 0, "saved batch must not have failed rows in v1");
    assert(savedBatch.analyticsFacts.length >= 2, "saved batch must include analytics facts");

    const duplicate = await fetchJson(`${baseUrl}/api/admin/import-confirm`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        sourceType: "manual",
        rows: [
          { date: validDate, unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 123456 },
          { date: validDate, unit: "Yerevan-1", metricKey: "ebitda", valueType: "fact", value: 22222 },
        ],
        idempotencyKey: validIdempotencyKey,
      }),
    });
    assert(duplicate.response.status === 200, "duplicate confirm must be controlled 200");
    assert(duplicate.body.meta.duplicate === true, "duplicate confirm must surface duplicate marker");

    const countsAfterDuplicate = await getCounts();
    assert(countsAfterDuplicate.importBatches === countsAfterValid.importBatches, "duplicate confirm must not create another import batch");
    assert(countsAfterDuplicate.analyticsFacts === countsAfterValid.analyticsFacts, "duplicate confirm must not create more facts");

    const adminImports = await fetch(`${baseUrl}/admin/imports`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
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
    assert(adminImports.status === 200, "/admin/imports must remain 200");
    assert(adminDataSources.status === 200, "/admin/data-sources must remain 200");
    assert(adminUsers.status === 200, "/admin/users must remain 200");
    assert(adminMetrics.status === 200, "/admin/metrics must remain 200");

    console.log("Import confirm checks passed.");
  } finally {
    stopDevServer(child);
    await delay(800);
    await prisma.$disconnect();
  }
}

run().catch(async (error) => {
  console.error(`Import confirm checks failed: ${error instanceof Error ? error.message : String(error)}`);
  await prisma.$disconnect();
  process.exit(1);
});
