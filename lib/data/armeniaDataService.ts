import { DashboardDataNotFoundError } from "@/lib/data/dashboardDataService";
import { getStaticArmeniaDashboardData } from "@/lib/data/staticArmeniaDataSource";
import type { ArmeniaDashboardData } from "@/types/armenia";

export type ArmeniaDataParams = {
  source?: "static-json" | "database" | "excel" | "google-sheets";
};

export async function getArmeniaDashboardData(params: ArmeniaDataParams = {}): Promise<ArmeniaDashboardData> {
  try {
    switch (params.source ?? "static-json") {
      case "static-json":
      case "database":
      case "excel":
      case "google-sheets":
      default:
        return await getStaticArmeniaDashboardData();
    }
  } catch (error) {
    if (error instanceof DashboardDataNotFoundError) throw error;
    throw new DashboardDataNotFoundError("Armenia dashboard data not found");
  }
}
