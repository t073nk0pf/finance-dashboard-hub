import type { DashboardData } from "@/types/dashboard";
import type { ForecastResult } from "@/lib/forecast/types";

export type DashboardPlanFactApiResponse = DashboardData;

export type DashboardForecastApiResponse = {
  scenarios: ForecastResult["scenarios"] | [];
  rows?: ForecastResult["rows"];
  summary?: ForecastResult["summary"];
  generatedAt?: string;
  next?: string;
};
