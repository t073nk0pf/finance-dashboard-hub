import { runDashboardTemplateRoutePipeline } from "../lib/dashboard/template/routeOrchestrator.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  process.env.USE_DASHBOARD_TEMPLATE = "true";
  process.env.USE_ANALYTICS_ENGINE = "true";

  const templateWins = await runDashboardTemplateRoutePipeline({
    routeName: "/test/template",
    legacyFallbackData: { source: "legacy" },
    runTemplate: async () => ({ value: "template" }),
    adaptTemplateResult: (result) => ({ data: { source: result.value }, hasData: true }),
    runAnalyticsFallback: async () => ({ value: "analytics" }),
    adaptAnalyticsResult: (result) => ({ data: { source: result.value }, hasData: true }),
  });
  assert(templateWins.data.source === "template", "template branch should win");

  const analyticsWinsOnTemplateEmpty = await runDashboardTemplateRoutePipeline({
    routeName: "/test/template-empty",
    legacyFallbackData: { source: "legacy" },
    runTemplate: async () => ({ value: "template" }),
    adaptTemplateResult: () => ({ data: { source: "template" }, hasData: false }),
    runAnalyticsFallback: async () => ({ value: "analytics" }),
    adaptAnalyticsResult: (result) => ({ data: { source: result.value }, hasData: true }),
  });
  assert(analyticsWinsOnTemplateEmpty.data.source === "analytics", "analytics branch should win on template empty");

  const analyticsWinsOnTemplateError = await runDashboardTemplateRoutePipeline({
    routeName: "/test/template-error",
    legacyFallbackData: { source: "legacy" },
    runTemplate: async () => {
      throw new Error("template fail");
    },
    adaptTemplateResult: () => ({ data: { source: "template" }, hasData: false }),
    runAnalyticsFallback: async () => ({ value: "analytics" }),
    adaptAnalyticsResult: (result) => ({ data: { source: result.value }, hasData: true }),
  });
  assert(analyticsWinsOnTemplateError.data.source === "analytics", "analytics branch should win on template error");

  const legacyWinsOnAnalyticsEmpty = await runDashboardTemplateRoutePipeline({
    routeName: "/test/analytics-empty",
    legacyFallbackData: { source: "legacy" },
    runTemplate: async () => ({ value: "template" }),
    adaptTemplateResult: () => ({ data: { source: "template" }, hasData: false }),
    runAnalyticsFallback: async () => ({ value: "analytics" }),
    adaptAnalyticsResult: () => ({ data: { source: "analytics" }, hasData: false }),
  });
  assert(legacyWinsOnAnalyticsEmpty.data.source === "legacy", "legacy should win on analytics empty");

  process.env.USE_DASHBOARD_TEMPLATE = "false";
  process.env.USE_ANALYTICS_ENGINE = "false";
  const legacyWhenDisabled = await runDashboardTemplateRoutePipeline({
    routeName: "/test/disabled-flags",
    legacyFallbackData: { source: "legacy" },
  });
  assert(legacyWhenDisabled.data.source === "legacy", "legacy should win when both flags are disabled");

  console.log("Template route orchestrator checks passed.");
}

run().catch((error) => {
  console.error(`Template route orchestrator checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
