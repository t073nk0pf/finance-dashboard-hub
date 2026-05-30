import bcrypt from "bcryptjs";
import { MetricDirection, MetricFormat, MetricKind, PrismaClient, UserRole } from "@prisma/client";

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
    {
      code: "revenue",
      name: "Выручка",
      category: "financial",
      article: "revenue",
      unitType: "money",
      direction: MetricDirection.HIGHER_IS_BETTER,
      format: MetricFormat.MONEY,
      kind: MetricKind.POSITIVE_MONEY,
      sortOrder: 10,
    },
    {
      code: "ebitda",
      name: "EBITDA",
      category: "financial",
      article: "ebitda",
      unitType: "money",
      direction: MetricDirection.HIGHER_IS_BETTER,
      format: MetricFormat.MONEY,
      kind: MetricKind.POSITIVE_MONEY,
      sortOrder: 20,
    },
    {
      code: "uc",
      name: "UC",
      category: "cost",
      article: "uc",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 30,
    },
    {
      code: "dc",
      name: "DC",
      category: "cost",
      article: "dc",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 40,
    },
    {
      code: "labor",
      name: "Фонд оплаты труда",
      category: "cost",
      article: "labor",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 50,
    },
    {
      code: "rent",
      name: "Аренда",
      category: "cost",
      article: "rent",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 60,
    },
    {
      code: "marketing",
      name: "Маркетинг",
      category: "cost",
      article: "marketing",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 70,
    },
    {
      code: "utilities",
      name: "Коммунальные услуги",
      category: "cost",
      article: "utilities",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 80,
    },
    {
      code: "write_offs",
      name: "Списания",
      category: "cost",
      article: "write_offs",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 90,
    },
    {
      code: "other_expenses",
      name: "Прочие расходы",
      category: "cost",
      article: "other_expenses",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 100,
    },
    {
      code: "opex",
      name: "Операционные расходы",
      category: "cost",
      article: "opex",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 110,
    },
    {
      code: "net-profit",
      name: "Чистая прибыль",
      category: "financial",
      article: "net_profit",
      unitType: "money",
      direction: MetricDirection.HIGHER_IS_BETTER,
      format: MetricFormat.MONEY,
      kind: MetricKind.POSITIVE_MONEY,
      sortOrder: 120,
    },
    {
      code: "food-cost",
      name: "Расчетный Food Cost",
      category: "cost",
      article: "food_cost",
      unitType: "share",
      direction: MetricDirection.LOWER_IS_BETTER,
      format: MetricFormat.PERCENT,
      kind: MetricKind.EXPENSE_SHARE,
      sortOrder: 130,
    },
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
