import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DashboardData } from "@/types/dashboard";

const sampleDataPath = path.join(process.cwd(), "data", "sample-dashboard-data.json");

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DashboardData>;
  return Boolean(
    candidate.source &&
      candidate.metrics &&
      candidate.metrics.revenue &&
      candidate.mainArticles &&
      Array.isArray(candidate.mainArticles) &&
      candidate.expenseVariance &&
      candidate.entities &&
      Array.isArray(candidate.entities),
  );
}

export async function getStaticJsonDashboardData(): Promise<DashboardData> {
  const raw = await readFile(sampleDataPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!isDashboardData(parsed)) {
    throw new Error("Dashboard data JSON has invalid shape");
  }

  return parsed;
}
