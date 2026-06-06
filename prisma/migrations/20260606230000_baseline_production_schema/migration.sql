-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FINANCE', 'DIRECTOR', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('MONTH', 'WEEK', 'DAY', 'YTD');

-- CreateEnum
CREATE TYPE "MetricKind" AS ENUM ('EXPENSE_SHARE', 'POSITIVE_MONEY', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TvSlideMode" AS ENUM ('ROTATE', 'FIXED');

-- CreateEnum
CREATE TYPE "GrowthStatus" AS ENUM ('BLOCKED', 'WATCH', 'PRELIMINARY', 'READY', 'ACCELERATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "restaurantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "type" "PeriodType" NOT NULL DEFAULT 'MONTH',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'RU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'RU',
    "legalEntityId" TEXT,
    "openedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricArticle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "kind" "MetricKind" NOT NULL DEFAULT 'NEUTRAL',
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFactValue" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "restaurantId" TEXT,
    "plan" DECIMAL(18,2) NOT NULL,
    "fact" DECIMAL(18,2) NOT NULL,
    "planShare" DECIMAL(9,6),
    "factShare" DECIMAL(9,6),
    "sourceBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFactValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyFactValue" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "articleId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "restaurantId" TEXT,
    "value" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyFactValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualAdjustment" (
    "id" TEXT NOT NULL,
    "periodId" TEXT,
    "articleId" TEXT NOT NULL,
    "legalEntityId" TEXT,
    "restaurantId" TEXT,
    "amount" DECIMAL(18,2),
    "shareDeltaPp" DECIMAL(9,4),
    "reason" TEXT NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "meta" JSONB,
    "importedById" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeTvConfig" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "refreshSeconds" INTEGER NOT NULL DEFAULT 300,
    "slideMode" "TvSlideMode" NOT NULL DEFAULT 'ROTATE',
    "hiddenMetrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeTvConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthReadinessSnapshot" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "revenue" DECIMAL(18,2) NOT NULL,
    "ebitda" DECIMAL(18,2) NOT NULL,
    "ebitdaMargin" DECIMAL(9,6) NOT NULL,
    "netProfit" DECIMAL(18,2) NOT NULL,
    "foodCostShare" DECIMAL(9,6) NOT NULL,
    "opexShare" DECIMAL(9,6) NOT NULL,
    "restaurants" INTEGER NOT NULL,
    "status" "GrowthStatus" NOT NULL DEFAULT 'WATCH',
    "excludeFromReadiness" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkGrowthScenario" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ebitdaThreshold" DECIMAL(9,6) NOT NULL DEFAULT 0.15,
    "accelerationThreshold" DECIMAL(9,6) NOT NULL DEFAULT 0.17,
    "minStableMonths" INTEGER NOT NULL DEFAULT 3,
    "excludeMonthKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkGrowthScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserAccess_userId_idx" ON "UserAccess"("userId");

-- CreateIndex
CREATE INDEX "UserAccess_module_idx" ON "UserAccess"("module");

-- CreateIndex
CREATE UNIQUE INDEX "Period_key_key" ON "Period"("key");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_slug_key" ON "LegalEntity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");

-- CreateIndex
CREATE INDEX "Restaurant_legalEntityId_idx" ON "Restaurant"("legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricArticle_code_key" ON "MetricArticle"("code");

-- CreateIndex
CREATE INDEX "MetricArticle_parentId_idx" ON "MetricArticle"("parentId");

-- CreateIndex
CREATE INDEX "MetricArticle_kind_idx" ON "MetricArticle"("kind");

-- CreateIndex
CREATE INDEX "PlanFactValue_periodId_idx" ON "PlanFactValue"("periodId");

-- CreateIndex
CREATE INDEX "PlanFactValue_articleId_idx" ON "PlanFactValue"("articleId");

-- CreateIndex
CREATE INDEX "PlanFactValue_legalEntityId_idx" ON "PlanFactValue"("legalEntityId");

-- CreateIndex
CREATE INDEX "PlanFactValue_restaurantId_idx" ON "PlanFactValue"("restaurantId");

-- CreateIndex
CREATE INDEX "DailyFactValue_date_idx" ON "DailyFactValue"("date");

-- CreateIndex
CREATE INDEX "DailyFactValue_articleId_idx" ON "DailyFactValue"("articleId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeTvConfig_market_key" ON "OfficeTvConfig"("market");

-- CreateIndex
CREATE INDEX "GrowthReadinessSnapshot_market_idx" ON "GrowthReadinessSnapshot"("market");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthReadinessSnapshot_market_periodId_key" ON "GrowthReadinessSnapshot"("market", "periodId");

-- CreateIndex
CREATE INDEX "NetworkGrowthScenario_market_idx" ON "NetworkGrowthScenario"("market");

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricArticle" ADD CONSTRAINT "MetricArticle_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MetricArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFactValue" ADD CONSTRAINT "PlanFactValue_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFactValue" ADD CONSTRAINT "PlanFactValue_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "MetricArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFactValue" ADD CONSTRAINT "PlanFactValue_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFactValue" ADD CONSTRAINT "PlanFactValue_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFactValue" ADD CONSTRAINT "PlanFactValue_sourceBatchId_fkey" FOREIGN KEY ("sourceBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFactValue" ADD CONSTRAINT "DailyFactValue_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "MetricArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFactValue" ADD CONSTRAINT "DailyFactValue_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFactValue" ADD CONSTRAINT "DailyFactValue_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualAdjustment" ADD CONSTRAINT "ManualAdjustment_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualAdjustment" ADD CONSTRAINT "ManualAdjustment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "MetricArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualAdjustment" ADD CONSTRAINT "ManualAdjustment_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualAdjustment" ADD CONSTRAINT "ManualAdjustment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualAdjustment" ADD CONSTRAINT "ManualAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthReadinessSnapshot" ADD CONSTRAINT "GrowthReadinessSnapshot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

