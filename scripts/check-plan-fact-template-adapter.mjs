import { adaptTemplateToPlanFactLegacyResponse } from "../lib/dashboard/adapters/templateToPlanFactLegacyAdapter.ts";
import { getPlanFactDashboardData } from "../lib/data/dashboardDataService.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertLegacyShape(data) {
  assert(isObject(data), "response must be object");
  assert(Array.isArray(data.months), "months must be array");
  assert(isObject(data.metrics), "metrics must be object");
  assert(Array.isArray(data.mainArticles), "mainArticles must be array");
  assert(isObject(data.expenseVariance), "expenseVariance must be object");
  assert(Array.isArray(data.entities), "entities must be array");
}

async function run() {
  const fallback = await getPlanFactDashboardData({ source: "static-json" });

  const composedLike = {
    sections: {
      plan_fact: {
        months: fallback.months,
        metrics: fallback.metrics,
        mainArticles: fallback.mainArticles,
      },
      article_performance: {
        better: fallback.expenseVariance.better,
        worse: fallback.expenseVariance.worse,
      },
      unit_performance: {
        entities: fallback.entities,
      },
    },
  };

  const happy = adaptTemplateToPlanFactLegacyResponse({
    composedData: composedLike,
    fallbackDashboardData: fallback,
  });
  assert(happy.hasData === true, "adapter should mark composed data as available");
  assertLegacyShape(happy.data);

  const empty = adaptTemplateToPlanFactLegacyResponse({
    composedData: null,
    fallbackDashboardData: fallback,
  });
  assert(empty.hasData === false, "adapter should mark empty composed data as unavailable");
  assertLegacyShape(empty.data);

  const broken = adaptTemplateToPlanFactLegacyResponse({
    composedData: { sections: { plan_fact: { months: [] } } },
    fallbackDashboardData: fallback,
  });
  assert(broken.hasData === false, "adapter should mark broken composed data as unavailable");
  assertLegacyShape(broken.data);

  console.log("Plan-fact template adapter checks passed.");
}

run().catch((error) => {
  console.error(`Plan-fact template adapter checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
