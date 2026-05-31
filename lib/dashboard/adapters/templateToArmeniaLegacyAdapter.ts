import type { ComposedDashboardData } from "@/lib/dashboard/template/composer";
import type { ArmeniaDashboardData } from "@/types/armenia";

export type TemplateToArmeniaLegacyAdapterInput = {
  composedData: ComposedDashboardData | null | undefined;
  fallbackArmeniaData: ArmeniaDashboardData;
};

export type TemplateToArmeniaLegacyAdapterResult = {
  data: ArmeniaDashboardData;
  hasData: boolean;
};

function hasArmeniaLegacyShape(value: unknown): value is ArmeniaDashboardData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.source !== null &&
    typeof candidate.source === "object" &&
    candidate.period !== null &&
    typeof candidate.period === "object" &&
    candidate.kpis !== null &&
    typeof candidate.kpis === "object" &&
    Array.isArray(candidate.monthlySeries) &&
    Array.isArray(candidate.restaurants) &&
    Array.isArray(candidate.profitabilityDrivers) &&
    candidate.growthReadiness !== null &&
    typeof candidate.growthReadiness === "object" &&
    candidate.unitEconomics !== null &&
    typeof candidate.unitEconomics === "object"
  );
}

export function adaptTemplateToArmeniaLegacyResponse(
  input: TemplateToArmeniaLegacyAdapterInput,
): TemplateToArmeniaLegacyAdapterResult {
  const { composedData, fallbackArmeniaData } = input;

  if (!composedData || typeof composedData !== "object") {
    return { data: fallbackArmeniaData, hasData: false };
  }

  const hasUsefulSections = Boolean(
    composedData.sections?.executive_summary ||
      composedData.sections?.current_results ||
      composedData.sections?.plan_fact ||
      composedData.sections?.forecast,
  );

  if (!hasUsefulSections) {
    return { data: fallbackArmeniaData, hasData: false };
  }

  if (!hasArmeniaLegacyShape(fallbackArmeniaData)) {
    return { data: fallbackArmeniaData, hasData: false };
  }

  return {
    data: fallbackArmeniaData,
    hasData: true,
  };
}
