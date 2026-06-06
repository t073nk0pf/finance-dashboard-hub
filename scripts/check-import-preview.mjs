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
  assert(Array.isArray(body.rowsPreview), "rowsPreview must be array");
  assert(Array.isArray(body.errors), "errors must be array");
  assert(isObject(body.summary), "summary must be object");
  assert(isObject(body.meta), "meta must be object");
  assert(body.meta.persisted === false, "meta.persisted must be false");
  assert(body.meta.source === "import_preview", "meta.source must be import_preview");
}

async function run() {
  await ensureViewerUser();

  const port = 3152;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port);

  try {
    await waitForServer(baseUrl);

    const countsBefore = await getCounts();

    const unauth = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType: "manual", rows: [] }),
    });
    assert(unauth.response.status === 401, "unauth preview must be 401");

    const viewerCookie = await login(baseUrl, VIEWER_EMAIL, VIEWER_PASSWORD);
    const viewer = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: viewerCookie,
      },
      body: JSON.stringify({ sourceType: "manual", rows: [] }),
    });
    assert(viewer.response.status === 403, "viewer preview must be 403");

    const adminCookie = await login(baseUrl, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminHeaders = {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    };

    const validPayload = {
      sourceType: "manual",
      rows: [
        {
          date: "2026-05-01",
          unit: "Yerevan-1",
          metricKey: "revenue",
          valueType: "fact",
          value: 100000,
        },
      ],
    };

    const validPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(validPayload),
    });
    assert(validPreview.response.status === 200, "admin valid preview must be 200");
    assertPreviewShape(validPreview.body);
    assert(validPreview.body.summary.totalRows > 0, "valid preview must include rows");

    const invalidPayload = {
      sourceType: "manual",
      rows: [
        { date: "bad-date", unit: "Yerevan-1", metricKey: "revenue", valueType: "fact", value: 100000 },
        { date: "2026-05-01", unit: "Yerevan-1", metricKey: "unknown_metric", valueType: "fact", value: 100000 },
        { date: "2026-05-01", unit: "Yerevan-1", metricKey: "revenue", valueType: "fact" },
        { date: "2026-05-01", unit: "Yerevan-1", metricKey: "revenue", valueType: "bad", value: 100000 },
      ],
    };

    const invalidPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(invalidPayload),
    });
    assert(invalidPreview.response.status === 200, "invalid rows preview must be controlled 200");
    assertPreviewShape(invalidPreview.body);
    assert(invalidPreview.body.summary.invalidRows > 0, "invalid rows preview must mark invalid rows");
    assert(invalidPreview.body.errors.length > 0, "invalid rows preview must include errors");

    const emptyPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ sourceType: "manual", rows: [] }),
    });
    assert(emptyPreview.response.status === 200, "empty rows preview must be 200");
    assertPreviewShape(emptyPreview.body);
    assert(emptyPreview.body.summary.totalRows === 0, "empty preview must report zero rows");

    const badPayload = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ sourceType: "manual", rows: "bad" }),
    });
    assert(badPayload.response.status === 400, "bad payload must return 400");

    const tooManyRows = Array.from({ length: 501 }, (_, index) => ({
      date: "2026-05-01",
      unit: "Yerevan-1",
      metricKey: "revenue",
      valueType: "fact",
      value: 100000 + index,
    }));
    const tooManyPreview = await fetchJson(`${baseUrl}/api/admin/import-preview`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ sourceType: "manual", rows: tooManyRows }),
    });
    assert(tooManyPreview.response.status === 400, "too many rows must return 400");
    assert(tooManyPreview.body?.error === "preview_rows_limit_exceeded", "too many rows error code mismatch");

    const countsAfter = await getCounts();
    assert(countsAfter.importBatches === countsBefore.importBatches, "preview must not create import batches");
    assert(countsAfter.analyticsFacts === countsBefore.analyticsFacts, "preview must not create analytics facts");

    console.log("Import preview checks passed.");
  } finally {
    stopDevServer(child);
    await delay(800);
    await prisma.$disconnect();
  }
}

run().catch(async (error) => {
  console.error(`Import preview checks failed: ${error instanceof Error ? error.message : String(error)}`);
  await prisma.$disconnect();
  process.exit(1);
});
