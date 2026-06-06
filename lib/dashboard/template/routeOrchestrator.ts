import { isAnalyticsEngineEnabled, isDashboardTemplateEnabled } from "@/lib/dashboard/featureFlags";
import { logDashboardFallback } from "@/lib/dashboard/fallbackLogger";

export type RouteOrchestratorSource = "template" | "analytics" | "legacy";

export type RouteOrchestratorResult<TData> = {
  data: TData;
  source: RouteOrchestratorSource;
  usedFallback: boolean;
  reason?: string;
  meta?: Record<string, unknown>;
};

type RouteOrchestratorInput<TData, TTemplateResult, TAnalyticsResult> = {
  routeName: string;
  legacyFallbackData: TData;
  runTemplate?: () => Promise<TTemplateResult>;
  adaptTemplateResult?: (result: TTemplateResult) => { data: TData; hasData: boolean };
  runAnalyticsFallback?: () => Promise<TAnalyticsResult>;
  adaptAnalyticsResult?: (result: TAnalyticsResult) => { data: TData; hasData: boolean };
};

export async function runDashboardTemplateRoutePipeline<TData, TTemplateResult, TAnalyticsResult>(
  input: RouteOrchestratorInput<TData, TTemplateResult, TAnalyticsResult>,
): Promise<RouteOrchestratorResult<TData>> {
  const templateEnabled = isDashboardTemplateEnabled();
  const analyticsEnabled = isAnalyticsEngineEnabled();

  if (!templateEnabled) {
    logDashboardFallback("template_route_template_disabled", {
      route: input.routeName,
    });
  }

  if (templateEnabled && input.runTemplate && input.adaptTemplateResult) {
    try {
      const templateResult = await input.runTemplate();
      const adapted = input.adaptTemplateResult(templateResult);
      if (adapted.hasData) {
        return {
          data: adapted.data,
          source: "template",
          usedFallback: false,
        };
      }

      logDashboardFallback("template_route_template_empty", {
        route: input.routeName,
      });
    } catch (error) {
      logDashboardFallback("template_route_template_error", {
        route: input.routeName,
        note: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  if (!analyticsEnabled) {
    logDashboardFallback("template_route_analytics_disabled", {
      route: input.routeName,
    });
    logDashboardFallback("template_route_legacy_fallback", {
      route: input.routeName,
    });
    return {
      data: input.legacyFallbackData,
      source: "legacy",
      usedFallback: true,
      reason: "analytics_disabled",
    };
  }

  if (input.runAnalyticsFallback && input.adaptAnalyticsResult) {
    try {
      const analyticsResult = await input.runAnalyticsFallback();
      const adapted = input.adaptAnalyticsResult(analyticsResult);
      if (adapted.hasData) {
        return {
          data: adapted.data,
          source: "analytics",
          usedFallback: true,
        };
      }

      logDashboardFallback("template_route_analytics_empty", {
        route: input.routeName,
      });
    } catch (error) {
      logDashboardFallback("template_route_analytics_error", {
        route: input.routeName,
        note: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  logDashboardFallback("template_route_legacy_fallback", {
    route: input.routeName,
  });
  return {
    data: input.legacyFallbackData,
    source: "legacy",
    usedFallback: true,
    reason: "analytics_empty_or_error",
  };
}
