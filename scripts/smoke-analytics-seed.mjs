import { PrismaClient, SourceType } from "@prisma/client";

const prisma = new PrismaClient();
const sourceId = "analytics-seed-v1";

async function checkDatabase() {
  const [units, metrics, facts] = await Promise.all([
    prisma.unit.count({
      where: {
        externalId: {
          in: [
            "am-yerevan-1",
            "am-yerevan-2",
            "am-yerevan-3",
            "am-gyumri-1",
            "ru-spb-1",
            "ru-spb-2",
            "ru-volkhov-1",
          ],
        },
      },
    }),
    prisma.metricArticle.count({
      where: {
        code: {
          in: ["revenue", "ebitda", "uc", "dc", "labor", "rent", "marketing", "utilities", "write_offs", "other_expenses"],
        },
      },
    }),
    prisma.analyticsFact.count({
      where: {
        sourceType: SourceType.SEED,
        sourceId,
      },
    }),
  ]);

  console.log(`seed units: ${units}`);
  console.log(`seed metric definitions: ${metrics}`);
  console.log(`seed analytics facts: ${facts}`);
}

async function checkApiIfAvailable() {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) return;

  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin";

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });

  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) {
    console.log("api login failed");
    return;
  }

  const routes = [
    "/api/analytics/plan-fact?country=armenia&from=2026-05-01&to=2026-05-31&groupBy=metric",
    "/api/analytics/forecast?country=armenia&from=2026-05-01&to=2026-05-31&asOfDate=2026-05-17&metrics=revenue,ebitda",
  ];

  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    console.log(`${route} ${response.status}`);
  }
}

try {
  await checkDatabase();
  await checkApiIfAvailable();
} finally {
  await prisma.$disconnect();
}
