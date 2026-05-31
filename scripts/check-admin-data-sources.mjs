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

function assertDataSourcesShape(body) {
  assert(isObject(body), "data-sources response must be object");
  assert(Array.isArray(body.sources), "data-sources.sources must be array");
  assert(isObject(body.summary), "data-sources.summary must be object");
  assert(isObject(body.meta), "data-sources.meta must be object");
}

function assertImportBatchesShape(body) {
  assert(isObject(body), "import-batches response must be object");
  assert(Array.isArray(body.batches), "import-batches.batches must be array");
  assert(isObject(body.summary), "import-batches.summary must be object");
  assert(isObject(body.meta), "import-batches.meta must be object");
}

function assertDataSourceDetailsShape(body) {
  assert(isObject(body), "data-source-details response must be object");
  assert(isObject(body.source), "data-source-details.source must be object");
  assert(isObject(body.summary), "data-source-details.summary must be object");
  assert(Array.isArray(body.recentBatches), "data-source-details.recentBatches must be array");
  assert(Array.isArray(body.recentErrors), "data-source-details.recentErrors must be array");
  assert(isObject(body.meta), "data-source-details.meta must be object");
}

async function run() {
  await ensureViewerUser();

  const port = 3150;
  const baseUrl = `http://localhost:${port}`;
  const child = startDevServer(port);

  try {
    await waitForServer(baseUrl);

    const unauthSources = await fetchJson(`${baseUrl}/api/admin/data-sources`);
    assert(unauthSources.response.status === 401, "unauth /api/admin/data-sources must be 401");

    const unauthBatches = await fetchJson(`${baseUrl}/api/admin/import-batches`);
    assert(unauthBatches.response.status === 401, "unauth /api/admin/import-batches must be 401");

    const viewerCookie = await login(baseUrl, VIEWER_EMAIL, VIEWER_PASSWORD);
    const viewerHeaders = { Cookie: viewerCookie };
    const viewerSources = await fetchJson(`${baseUrl}/api/admin/data-sources`, { headers: viewerHeaders });
    assert(viewerSources.response.status === 403, "viewer /api/admin/data-sources must be 403");

    const viewerBatches = await fetchJson(`${baseUrl}/api/admin/import-batches`, { headers: viewerHeaders });
    assert(viewerBatches.response.status === 403, "viewer /api/admin/import-batches must be 403");

    const viewerDetails = await fetchJson(`${baseUrl}/api/admin/data-sources/non-existing-id`, { headers: viewerHeaders });
    assert(viewerDetails.response.status === 403, "viewer /api/admin/data-sources/[id] must be 403");

    const adminCookie = await login(baseUrl, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminHeaders = { Cookie: adminCookie };

    const adminPage = await fetch(`${baseUrl}/admin/data-sources`, { headers: adminHeaders, redirect: "manual" });
    assert(adminPage.status === 200, "admin /admin/data-sources must be 200");

    const adminSources = await fetchJson(`${baseUrl}/api/admin/data-sources`, { headers: adminHeaders });
    assert(adminSources.response.status === 200, "admin /api/admin/data-sources must be 200");
    assertDataSourcesShape(adminSources.body);

    const adminBatches = await fetchJson(`${baseUrl}/api/admin/import-batches`, { headers: adminHeaders });
    assert(adminBatches.response.status === 200, "admin /api/admin/import-batches must be 200");
    assertImportBatchesShape(adminBatches.body);

    const unauthDetails = await fetchJson(`${baseUrl}/api/admin/data-sources/non-existing-id`);
    assert(unauthDetails.response.status === 401, "unauth /api/admin/data-sources/[id] must be 401");

    const firstSourceId = adminSources.body.sources[0]?.id;
    if (firstSourceId) {
      const detailsApi = await fetchJson(`${baseUrl}/api/admin/data-sources/${firstSourceId}`, { headers: adminHeaders });
      assert(detailsApi.response.status === 200, "admin /api/admin/data-sources/[id] must be 200 when source exists");
      assertDataSourceDetailsShape(detailsApi.body);

      const detailsPage = await fetch(`${baseUrl}/admin/data-sources/${firstSourceId}`, {
        headers: adminHeaders,
        redirect: "manual",
      });
      assert(detailsPage.status === 200, "admin /admin/data-sources/[id] must be 200 when source exists");
    } else {
      const missingDetails = await fetchJson(`${baseUrl}/api/admin/data-sources/non-existing-id`, { headers: adminHeaders });
      assert(missingDetails.response.status === 404, "admin unknown source id must return 404");
    }

    const adminUsers = await fetch(`${baseUrl}/admin/users`, { headers: adminHeaders, redirect: "manual" });
    const adminImports = await fetch(`${baseUrl}/admin/imports`, { headers: adminHeaders, redirect: "manual" });
    const adminMetrics = await fetch(`${baseUrl}/admin/metrics`, { headers: adminHeaders, redirect: "manual" });
    assert(adminUsers.status === 200, "/admin/users must remain 200 for admin");
    assert(adminImports.status === 200, "/admin/imports must remain 200 for admin");
    assert(adminMetrics.status === 200, "/admin/metrics must remain 200 for admin");

    console.log("Admin data sources checks passed.");
  } finally {
    stopDevServer(child);
    await delay(800);
    await prisma.$disconnect();
  }
}

run().catch(async (error) => {
  console.error(`Admin data sources checks failed: ${error instanceof Error ? error.message : String(error)}`);
  await prisma.$disconnect();
  process.exit(1);
});
