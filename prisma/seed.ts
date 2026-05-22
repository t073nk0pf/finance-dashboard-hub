import bcrypt from "bcryptjs";
import { MetricKind, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
    },
    create: {
      email,
      passwordHash,
      name: "Finance Admin",
      role: UserRole.ADMIN,
      active: true,
    },
  });

  const period = await prisma.period.upsert({
    where: { key: "2026-04-ytd" },
    update: {},
    create: {
      key: "2026-04-ytd",
      label: "Январь-апрель 2026",
      year: 2026,
      month: 4,
      type: "YTD",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T23:59:59.000Z"),
    },
  });

  const articles = [
    { code: "revenue", name: "Выручка", kind: MetricKind.POSITIVE_MONEY, sortOrder: 10 },
    { code: "opex", name: "Операционные расходы", kind: MetricKind.EXPENSE_SHARE, sortOrder: 20 },
    { code: "ebitda", name: "EBITDA", kind: MetricKind.POSITIVE_MONEY, sortOrder: 30 },
    { code: "net-profit", name: "Чистая прибыль", kind: MetricKind.POSITIVE_MONEY, sortOrder: 40 },
    { code: "food-cost", name: "Расчетный Food Cost", kind: MetricKind.EXPENSE_SHARE, sortOrder: 50 },
  ];

  for (const article of articles) {
    await prisma.metricArticle.upsert({
      where: { code: article.code },
      update: article,
      create: article,
    });
  }

  await prisma.legalEntity.upsert({
    where: { slug: "zhar-pizza" },
    update: {},
    create: {
      name: "Жар Пицца",
      slug: "zhar-pizza",
      country: "RU",
    },
  });

  await prisma.officeTvConfig.upsert({
    where: { market: "armenia" },
    update: {},
    create: {
      market: "armenia",
      title: "Armenia Finance Pulse",
      refreshSeconds: 300,
      hiddenMetrics: ["net_profit_detail", "restaurant_level_pnl"],
    },
  });

  await prisma.networkGrowthScenario.upsert({
    where: { id: "armenia-base-scenario" },
    update: {},
    create: {
      id: "armenia-base-scenario",
      market: "armenia",
      name: "Base Armenia growth readiness",
      excludeMonthKeys: ["2026-05"],
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SEED",
      entityType: "System",
      entityId: period.id,
      after: { email, period: period.key },
    },
  });

  console.log(`Seed completed. Admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
