import type { DashboardMetric, EntityPerformance, ExpenseVarianceItem, MainArticle } from "@/types/dashboard";
import type { DashboardForecastApiResponse } from "@/lib/dashboard/types";

export type ExecutiveSummarySectionData = {
  kpis: Array<{
    key: string;
    title: string;
    plan?: number | null;
    fact?: number | null;
    delta?: number | null;
    status?: "normal" | "attention" | "risk" | "critical" | "no_data";
  }>;
  notes?: string[];
};

export type CurrentResultsSectionData = {
  metrics: DashboardMetric[];
  period: {
    from: string;
    to: string;
  };
};

export type PlanFactSectionData = {
  months: string[];
  metrics: Record<string, DashboardMetric>;
  mainArticles: MainArticle[];
};

export type ForecastSectionData = DashboardForecastApiResponse;

export type ArticlePerformanceSectionData = {
  better: ExpenseVarianceItem[];
  worse: ExpenseVarianceItem[];
};

export type UnitPerformanceSectionData = {
  entities: EntityPerformance[];
};

export type TableLayerSectionData = {
  rows: Array<Record<string, unknown>>;
};

export type DashboardSectionData =
  | ExecutiveSummarySectionData
  | CurrentResultsSectionData
  | PlanFactSectionData
  | ForecastSectionData
  | ArticlePerformanceSectionData
  | UnitPerformanceSectionData
  | TableLayerSectionData;
