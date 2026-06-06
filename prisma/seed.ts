import bcrypt from "bcryptjs";
import { AnalyticsValueType, DataSourceStatus, MetricDirection, MetricFormat, MetricKind, PrismaClient, SourceType, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

type SeedUnit = {
  id: string;
  name: string;
  country: "armenia" | "russia";
  region: string;
  externalId: string;
  statusProfile: "normal" | "attention" | "risk" | "critical";
};

const analyticsSeedSourceId = "analytics-seed-v1";
const analyticsSeedSourceName = "Analytics Seed Data v1";

const seedUnits: SeedUnit[] = [
  { id: "unit-am-yerevan-1", name: "Yerevan-1", country: "armenia", region: "yerevan", externalId: "am-yerevan-1", statusProfile: "normal" },
  { id: "unit-am-yerevan-2", name: "Yerevan-2", country: "armenia", region: "yerevan", externalId: "am-yerevan-2", statusProfile: "attention" },
  { id: "unit-am-yerevan-3", name: "Yerevan-3", country: "armenia", region: "yerevan", externalId: "am-yerevan-3", statusProfile: "risk" },
  { id: "unit-am-gyumri-1", name: "Gyumri-1", country: "armenia", region: "gyumri", externalId: "am-gyumri-1", statusProfile: "critical" },
  { id: "unit-ru-spb-1", name: "SPB-1", country: "russia", region: "spb", externalId: "ru-spb-1", statusProfile: "normal" },
  { id: "unit-ru-spb-2", name: "SPB-2", country: "russia", region: "spb", externalId: "ru-spb-2", statusProfile: "risk" },
  { id: "unit-ru-volkhov-1", name: "Volkhov-1", country: "russia", region: "volkhov", externalId: "ru-volkhov-1", statusProfile: "attention" },
];

function getMayDates(): Date[] {
  const days: Date[] = [];
  for (let day = 1; day <= 31; day += 1) {
    days.push(new Date(Date.UTC(2026, 4, day, 12, 0, 0)));
  }
  return days;
}

function profileMultiplier(profile: SeedUnit["statusProfile"], metricKey: string, valueType: "plan" | "fact"): number {
  if (valueType === "plan") return 1;

  if (metricKey === "revenue" || metricKey === "ebitda") {
    if (profile === "normal") return 1.05;
    if (profile === "attention") return 0.97;
    if (profile === "risk") return 0.9;
    return 0.78;
  }

  if (profile === "normal") return 0.95;
  if (profile === "attention") return 1.03;
  if (profile === "risk") return 1.1;
  return 1.2;
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function buildAnalyticsFacts(units: SeedUnit[]): {
  date: Date;
  country: string;
  region: string;
  unitId: string;
  metricKey: string;
  article: string;
  valueType: AnalyticsValueType;
  value: number;
  currency: string;
  sourceType: SourceType;
  sourceId: string;
}[] {
  const dates = getMayDates();
  const metrics = [
    { key: "revenue", article: "revenue", planDaily: 10000, currency: "AMD" },
    { key: "ebitda", article: "ebitda", planDaily: 1500, currency: "AMD" },
    { key: "uc", article: "uc", planDaily: 0.32, currency: "ratio" },
    { key: "dc", article: "dc", planDaily: 0.08, currency: "ratio" },
    { key: "labor", article: "labor", planDaily: 0.18, currency: "ratio" },
    { key: "rent", article: "rent", planDaily: 0.09, currency: "ratio" },
    { key: "marketing", article: "marketing", planDaily: 0.05, currency: "ratio" },
    { key: "write_offs", article: "write_offs", planDaily: 0.03, currency: "ratio" },
  ] as const;

  const facts: {
    date: Date;
    country: string;
    region: string;
    unitId: string;
    metricKey: string;
    article: string;
    valueType: AnalyticsValueType;
    value: number;
    currency: string;
    sourceType: SourceType;
    sourceId: string;
  }[] = [];

  for (const unit of units) {
    for (const metric of metrics) {
      for (const date of dates) {
        const plan = round(metric.planDaily);
        const fact = round(metric.planDaily * profileMultiplier(unit.statusProfile, metric.key, "fact"));

        facts.push({
          date,
          country: unit.country,
          region: unit.region,
          unitId: unit.id,
          metricKey: metric.key,
          article: metric.article,
          valueType: AnalyticsValueType.PLAN,
          value: plan,
          currency: metric.currency,
          sourceType: SourceType.SEED,
          sourceId: analyticsSeedSourceId,
        });

        facts.push({
          date,
          country: unit.country,
          region: unit.region,
          unitId: unit.id,
          metricKey: metric.key,
          article: metric.article,
          valueType: AnalyticsValueType.FACT,
          value: fact,
          currency: metric.currency,
          sourceType: SourceType.SEED,
          sourceId: analyticsSeedSourceId,
        });
      }
    }
  }

  return facts;
}

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

  for (const unit of seedUnits) {
    await prisma.unit.upsert({
      where: { id: unit.id },
      update: {
        name: unit.name,
        country: unit.country,
        region: unit.region,
        externalId: unit.externalId,
        isActive: true,
      },
      create: {
        id: unit.id,
        name: unit.name,
        country: unit.country,
        region: unit.region,
        externalId: unit.externalId,
        isActive: true,
      },
    });
  }

  await prisma.dataSource.upsert({
    where: { id: analyticsSeedSourceId },
    update: {
      name: analyticsSeedSourceName,
      type: SourceType.SEED,
      status: DataSourceStatus.ACTIVE,
      configJson: {
        version: "v1",
        period: "2026-05",
      },
    },
    create: {
      id: analyticsSeedSourceId,
      name: analyticsSeedSourceName,
      type: SourceType.SEED,
      status: DataSourceStatus.ACTIVE,
      configJson: {
        version: "v1",
        period: "2026-05",
      },
    },
  });

  await prisma.analyticsFact.deleteMany({
    where: {
      sourceType: SourceType.SEED,
      sourceId: analyticsSeedSourceId,
    },
  });

  const analyticsFacts = buildAnalyticsFacts(seedUnits);
  await prisma.analyticsFact.createMany({
    data: analyticsFacts,
  });

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
