-- CreateEnum
CREATE TYPE "MetricDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "MetricFormat" AS ENUM ('MONEY', 'PERCENT', 'NUMBER', 'PP', 'RATIO');

-- CreateEnum
CREATE TYPE "AnalyticsValueType" AS ENUM ('FACT', 'PLAN', 'FORECAST', 'BUSINESS_PLAN');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'EXCEL', 'CSV', 'GOOGLE_SHEETS', 'DODO_API', 'SEED');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- AlterEnum
ALTER TYPE "ImportStatus" ADD VALUE 'COMPLETED_WITH_ERRORS';

-- AlterTable
ALTER TABLE "MetricArticle" ADD COLUMN     "article" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "direction" "MetricDirection" NOT NULL DEFAULT 'NEUTRAL',
ADD COLUMN     "format" "MetricFormat" NOT NULL DEFAULT 'NUMBER',
ADD COLUMN     "unitType" TEXT;

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "metaJson" JSONB,
ADD COLUMN     "rowsFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rowsImported" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rowsTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" "SourceType" NOT NULL DEFAULT 'EXCEL';

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "externalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRowError" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "field" TEXT,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRowError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "configJson" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsFact" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "unitId" TEXT,
    "metricKey" TEXT NOT NULL,
    "article" TEXT,
    "valueType" "AnalyticsValueType" NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "currency" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "sourceId" TEXT,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Unit_country_idx" ON "Unit"("country");

-- CreateIndex
CREATE INDEX "Unit_region_idx" ON "Unit"("region");

-- CreateIndex
CREATE INDEX "Unit_externalId_idx" ON "Unit"("externalId");

-- CreateIndex
CREATE INDEX "ImportRowError_importBatchId_idx" ON "ImportRowError"("importBatchId");

-- CreateIndex
CREATE INDEX "ImportRowError_code_idx" ON "ImportRowError"("code");

-- CreateIndex
CREATE INDEX "DataSource_type_idx" ON "DataSource"("type");

-- CreateIndex
CREATE INDEX "DataSource_status_idx" ON "DataSource"("status");

-- CreateIndex
CREATE INDEX "AnalyticsFact_date_idx" ON "AnalyticsFact"("date");

-- CreateIndex
CREATE INDEX "AnalyticsFact_country_idx" ON "AnalyticsFact"("country");

-- CreateIndex
CREATE INDEX "AnalyticsFact_region_idx" ON "AnalyticsFact"("region");

-- CreateIndex
CREATE INDEX "AnalyticsFact_unitId_idx" ON "AnalyticsFact"("unitId");

-- CreateIndex
CREATE INDEX "AnalyticsFact_metricKey_idx" ON "AnalyticsFact"("metricKey");

-- CreateIndex
CREATE INDEX "AnalyticsFact_valueType_idx" ON "AnalyticsFact"("valueType");

-- CreateIndex
CREATE INDEX "AnalyticsFact_sourceType_idx" ON "AnalyticsFact"("sourceType");

-- CreateIndex
CREATE INDEX "AnalyticsFact_importBatchId_idx" ON "AnalyticsFact"("importBatchId");

-- CreateIndex
CREATE INDEX "MetricArticle_category_idx" ON "MetricArticle"("category");

-- CreateIndex
CREATE INDEX "MetricArticle_direction_idx" ON "MetricArticle"("direction");

-- CreateIndex
CREATE INDEX "ImportBatch_sourceId_idx" ON "ImportBatch"("sourceId");

-- CreateIndex
CREATE INDEX "ImportBatch_sourceType_idx" ON "ImportBatch"("sourceType");

-- CreateIndex
CREATE INDEX "ImportBatch_status_idx" ON "ImportBatch"("status");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRowError" ADD CONSTRAINT "ImportRowError_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsFact" ADD CONSTRAINT "AnalyticsFact_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsFact" ADD CONSTRAINT "AnalyticsFact_metricKey_fkey" FOREIGN KEY ("metricKey") REFERENCES "MetricArticle"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsFact" ADD CONSTRAINT "AnalyticsFact_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsFact" ADD CONSTRAINT "AnalyticsFact_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

