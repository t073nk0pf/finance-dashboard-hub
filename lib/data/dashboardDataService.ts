import { getDatabaseDashboardData } from "@/lib/data/databaseDataSource";
import { getExcelDashboardData } from "@/lib/data/excelDataSource";
import { getStaticJsonDashboardData } from "@/lib/data/staticJsonDataSource";
import type { DashboardData, DashboardDataParams } from "@/types/dashboard";

export class DashboardDataNotFoundError extends Error {
  constructor(message = "Dashboard data not found") {
    super(message);
    this.name = "DashboardDataNotFoundError";
  }
}

export async function getPlanFactDashboardData(params: DashboardDataParams = {}): Promise<DashboardData> {
  try {
    switch (params.source ?? "static-json") {
      case "database":
        return await getDatabaseDashboardData();
      case "excel":
        return await getExcelDashboardData();
      case "static-json":
      default:
        return await getStaticJsonDashboardData();
    }
  } catch (error) {
    if (error instanceof DashboardDataNotFoundError) throw error;
    throw new DashboardDataNotFoundError();
  }
}
