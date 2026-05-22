import type { DashboardData } from "@/types/dashboard";

export async function getExcelDashboardData(): Promise<DashboardData> {
  throw new Error("Excel dashboard data source is not implemented yet");
}
