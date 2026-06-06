import { adaptTemplateToForecastLegacyResponse } from "../lib/dashboard/adapters/templateToForecastLegacyAdapter.ts";
import { buildForecastFallbackResponse } from "../lib/dashboard/adapters/forecastAdapter.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasLegacyShape(data) {
  return isObject(data) && Array.isArray(data.scenarios) && typeof data.next === "string";
}

function hasEngineShape(data) {
  return (
    isObject(data) &&
    Array.isArray(data.scenarios) &&
    Array.isArray(data.rows) &&
    isObject(data.summary) &&
    typeof data.generatedAt === "string"
  );
}

async function run() {
  const fallback = buildForecastFallbackResponse();

  const composedLike = {
    sections: {
      forecast: {
        scenarios: ["pessimistic", "base", "optimistic"],
        rows: [{ metricKey: "revenue", scenario: "base" }],
        summary: { rowsTotal: 1 },
        generatedAt: new Date().toISOString(),
      },
    },
  };

  const happy = adaptTemplateToForecastLegacyResponse({
    composedData: composedLike,
    fallbackForecastData: fallback,
  });
  assert(happy.hasData === true, "adapter should mark composed forecast section as available");
  assert(hasEngineShape(happy.data), "adapter should return engine-compatible forecast shape");

  const empty = adaptTemplateToForecastLegacyResponse({
    composedData: null,
    fallbackForecastData: fallback,
  });
  assert(empty.hasData === false, "adapter should mark empty composed data as unavailable");
  assert(hasLegacyShape(empty.data), "adapter should return fallback legacy shape for empty data");

  const broken = adaptTemplateToForecastLegacyResponse({
    composedData: { sections: { forecast: { scenarios: [] } } },
    fallbackForecastData: fallback,
  });
  assert(broken.hasData === false, "adapter should mark broken composed data as unavailable");
  assert(hasLegacyShape(broken.data), "adapter should return fallback legacy shape for broken data");

  console.log("Forecast template adapter checks passed.");
}

run().catch((error) => {
  console.error(`Forecast template adapter checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
