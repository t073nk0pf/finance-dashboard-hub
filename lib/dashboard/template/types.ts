import type { DashboardFilters } from "@/lib/analytics/filters";

export type DashboardCountry = "all" | "armenia" | "russia";

export type DashboardScope = {
  country: DashboardCountry;
  region?: string | null;
  unitId?: string | null;
};

export type DashboardSectionKey =
  | "executive_summary"
  | "current_results"
  | "plan_fact"
  | "forecast"
  | "article_performance"
  | "unit_performance"
  | "table_layer"
  | "tv_summary";

export type DashboardDataSourceKey = "plan_fact" | "forecast" | "armenia" | "legacy_dashboard" | "analytics_engine";

export type DashboardSectionConfig = {
  key: DashboardSectionKey;
  title: string;
  enabled: boolean;
  order: number;
  dataSource: DashboardDataSourceKey;
  adapter?: "planFactAdapter" | "forecastAdapter" | "armeniaAdapter";
};

export type DashboardTemplateConfig = {
  id: string;
  title: string;
  scope: DashboardScope;
  defaultFilters: DashboardFilters;
  sections: DashboardSectionConfig[];
  featureFlags?: {
    useAnalyticsEngine?: boolean;
    allowLegacyFallback?: boolean;
    tvMode?: boolean;
  };
};
