import type { ComposedDashboardData } from "@/lib/dashboard/template/composer";
import type { DashboardForecastApiResponse } from "@/lib/dashboard/types";

export type TemplateToForecastLegacyAdapterInput = {
  composedData: ComposedDashboardData | null | undefined;
  fallbackForecastData: DashboardForecastApiResponse;
};

export type TemplateToForecastLegacyAdapterResult = {
  data: DashboardForecastApiResponse;
  hasData: boolean;
};

function hasEngineForecastShape(value: unknown): value is DashboardForecastApiResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.scenarios) &&
    Array.isArray(candidate.rows) &&
    candidate.summary !== null &&
    typeof candidate.summary === "object" &&
    typeof candidate.generatedAt === "string"
  );
}

function hasLegacyForecastShape(value: unknown): value is DashboardForecastApiResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.scenarios) && typeof candidate.next === "string";
}

export function adaptTemplateToForecastLegacyResponse(
  input: TemplateToForecastLegacyAdapterInput,
): TemplateToForecastLegacyAdapterResult {
  const { composedData, fallbackForecastData } = input;
  if (!composedData || typeof composedData !== "object") {
    return { data: fallbackForecastData, hasData: false };
  }

  const forecastSection = composedData.sections?.forecast;
  if (!forecastSection || typeof forecastSection !== "object") {
    return { data: fallbackForecastData, hasData: false };
  }

  if (hasEngineForecastShape(forecastSection)) {
    return {
      data: {
        scenarios: forecastSection.scenarios,
        rows: forecastSection.rows,
        summary: forecastSection.summary,
        generatedAt: forecastSection.generatedAt,
      },
      hasData: true,
    };
  }

  if (hasLegacyForecastShape(forecastSection)) {
    return {
      data: {
        scenarios: forecastSection.scenarios,
        next: forecastSection.next,
      },
      hasData: true,
    };
  }

  return { data: fallbackForecastData, hasData: false };
}
