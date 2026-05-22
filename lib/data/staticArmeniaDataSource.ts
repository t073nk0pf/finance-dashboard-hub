import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ArmeniaDashboardData } from "@/types/armenia";

const armeniaDataPath = path.join(process.cwd(), "data", "armenia-dashboard-data.json");

function isArmeniaDashboardData(value: unknown): value is ArmeniaDashboardData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ArmeniaDashboardData>;
  return Boolean(
    candidate.source &&
      candidate.period &&
      candidate.kpis &&
      Array.isArray(candidate.monthlySeries) &&
      Array.isArray(candidate.restaurants) &&
      Array.isArray(candidate.profitabilityDrivers) &&
      candidate.growthReadiness &&
      candidate.unitEconomics,
  );
}

export async function getStaticArmeniaDashboardData(): Promise<ArmeniaDashboardData> {
  const raw = await readFile(armeniaDataPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!isArmeniaDashboardData(parsed)) {
    throw new Error("Armenia dashboard data JSON has invalid shape");
  }

  return parsed;
}
