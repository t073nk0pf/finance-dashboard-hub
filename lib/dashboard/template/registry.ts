import { getDefaultDashboardFilters } from "@/lib/dashboard/queryFilters";
import type { DashboardTemplateConfig } from "@/lib/dashboard/template/types";

function buildBaseFilters(country: "all" | "armenia" | "russia") {
  const filters = getDefaultDashboardFilters();
  return {
    ...filters,
    country,
  };
}

export const overviewAllTemplate: DashboardTemplateConfig = {
  id: "overview-all",
  title: "Overview: All",
  scope: { country: "all", region: "all", unitId: null },
  defaultFilters: buildBaseFilters("all"),
  sections: [
    { key: "executive_summary", title: "Executive Summary", enabled: true, order: 1, dataSource: "analytics_engine" },
    { key: "current_results", title: "Current Results", enabled: true, order: 2, dataSource: "analytics_engine" },
    { key: "plan_fact", title: "Plan-Fact", enabled: true, order: 3, dataSource: "plan_fact", adapter: "planFactAdapter" },
    { key: "forecast", title: "Forecast", enabled: true, order: 4, dataSource: "forecast", adapter: "forecastAdapter" },
    { key: "article_performance", title: "Articles", enabled: true, order: 5, dataSource: "plan_fact" },
    { key: "unit_performance", title: "Units", enabled: true, order: 6, dataSource: "plan_fact" },
    { key: "table_layer", title: "Tables", enabled: true, order: 7, dataSource: "legacy_dashboard" },
  ],
};

export const armeniaTemplate: DashboardTemplateConfig = {
  id: "armenia-overview",
  title: "Armenia Overview",
  scope: { country: "armenia", region: "all", unitId: null },
  defaultFilters: buildBaseFilters("armenia"),
  sections: [
    { key: "executive_summary", title: "Executive Summary", enabled: true, order: 1, dataSource: "armenia", adapter: "armeniaAdapter" },
    { key: "current_results", title: "Current Results", enabled: true, order: 2, dataSource: "armenia" },
    { key: "plan_fact", title: "Plan-Fact", enabled: true, order: 3, dataSource: "plan_fact", adapter: "planFactAdapter" },
    { key: "forecast", title: "Forecast", enabled: true, order: 4, dataSource: "forecast", adapter: "forecastAdapter" },
    { key: "unit_performance", title: "Restaurants", enabled: true, order: 5, dataSource: "armenia" },
    { key: "table_layer", title: "Tables", enabled: true, order: 6, dataSource: "armenia" },
  ],
};

export const russiaTemplate: DashboardTemplateConfig = {
  id: "russia-overview",
  title: "Russia Overview",
  scope: { country: "russia", region: "all", unitId: null },
  defaultFilters: buildBaseFilters("russia"),
  sections: [
    { key: "executive_summary", title: "Executive Summary", enabled: true, order: 1, dataSource: "analytics_engine" },
    { key: "current_results", title: "Current Results", enabled: true, order: 2, dataSource: "analytics_engine" },
    { key: "plan_fact", title: "Plan-Fact", enabled: true, order: 3, dataSource: "plan_fact", adapter: "planFactAdapter" },
    { key: "forecast", title: "Forecast", enabled: true, order: 4, dataSource: "forecast", adapter: "forecastAdapter" },
    { key: "article_performance", title: "Articles", enabled: true, order: 5, dataSource: "plan_fact" },
    { key: "unit_performance", title: "Units", enabled: true, order: 6, dataSource: "plan_fact" },
    { key: "table_layer", title: "Tables", enabled: true, order: 7, dataSource: "legacy_dashboard" },
  ],
};

export const planFactTemplate: DashboardTemplateConfig = {
  id: "plan-fact",
  title: "Plan-Fact",
  scope: { country: "all", region: "all", unitId: null },
  defaultFilters: buildBaseFilters("all"),
  sections: [
    { key: "executive_summary", title: "Executive Summary", enabled: true, order: 1, dataSource: "plan_fact" },
    { key: "plan_fact", title: "Plan-Fact", enabled: true, order: 2, dataSource: "plan_fact", adapter: "planFactAdapter" },
    { key: "article_performance", title: "Articles", enabled: true, order: 3, dataSource: "plan_fact" },
    { key: "unit_performance", title: "Units", enabled: true, order: 4, dataSource: "plan_fact" },
    { key: "table_layer", title: "Tables", enabled: true, order: 5, dataSource: "legacy_dashboard" },
  ],
};

export const forecastTemplate: DashboardTemplateConfig = {
  id: "forecast",
  title: "Forecast",
  scope: { country: "all", region: "all", unitId: null },
  defaultFilters: buildBaseFilters("all"),
  sections: [
    { key: "executive_summary", title: "Executive Summary", enabled: true, order: 1, dataSource: "forecast" },
    { key: "forecast", title: "Forecast", enabled: true, order: 2, dataSource: "forecast", adapter: "forecastAdapter" },
    { key: "plan_fact", title: "Plan-Fact context", enabled: true, order: 3, dataSource: "plan_fact" },
    { key: "table_layer", title: "Tables", enabled: true, order: 4, dataSource: "legacy_dashboard" },
  ],
};

export const tvArmeniaTemplate: DashboardTemplateConfig = {
  id: "tv-armenia",
  title: "TV Armenia",
  scope: { country: "armenia", region: "all", unitId: null },
  defaultFilters: buildBaseFilters("armenia"),
  sections: [
    { key: "tv_summary", title: "TV Summary", enabled: true, order: 1, dataSource: "armenia", adapter: "armeniaAdapter" },
    { key: "forecast", title: "Forecast", enabled: true, order: 2, dataSource: "forecast", adapter: "forecastAdapter" },
  ],
  featureFlags: {
    tvMode: true,
    allowLegacyFallback: true,
  },
};

const templates: DashboardTemplateConfig[] = [
  overviewAllTemplate,
  armeniaTemplate,
  russiaTemplate,
  planFactTemplate,
  forecastTemplate,
  tvArmeniaTemplate,
];

export function listDashboardTemplates(): DashboardTemplateConfig[] {
  return templates;
}

export function getDashboardTemplate(templateId: string): DashboardTemplateConfig | undefined {
  return templates.find((template) => template.id === templateId);
}

export function getDashboardTemplateForScope(scope: { country: "all" | "armenia" | "russia"; tvMode?: boolean }): DashboardTemplateConfig {
  if (scope.tvMode && scope.country === "armenia") return tvArmeniaTemplate;
  if (scope.country === "armenia") return armeniaTemplate;
  if (scope.country === "russia") return russiaTemplate;
  return overviewAllTemplate;
}
