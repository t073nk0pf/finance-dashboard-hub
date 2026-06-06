import {
  armeniaTemplate,
  forecastTemplate,
  getDashboardTemplate,
  getDashboardTemplateForScope,
  listDashboardTemplates,
  overviewAllTemplate,
  planFactTemplate,
  russiaTemplate,
  tvArmeniaTemplate,
} from "../lib/dashboard/template/registry.ts";
import { composeDashboardData } from "../lib/dashboard/template/composer.ts";
import { getPlanFactDashboardData } from "../lib/data/dashboardDataService.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateTemplate(template) {
  assert(typeof template.id === "string" && template.id.length > 0, "template id is required");
  assert(typeof template.title === "string" && template.title.length > 0, "template title is required");
  assert(Array.isArray(template.sections) && template.sections.length > 0, `template ${template.id}: sections are required`);

  const keySet = new Set();
  let previousOrder = -1;
  for (const section of [...template.sections].sort((a, b) => a.order - b.order)) {
    assert(!keySet.has(section.key), `template ${template.id}: duplicate section key ${section.key}`);
    keySet.add(section.key);
    assert(section.order > previousOrder, `template ${template.id}: invalid section order`);
    previousOrder = section.order;
  }
}

async function run() {
  const templates = listDashboardTemplates();
  assert(templates.length >= 6, "expected at least 6 templates");
  templates.forEach(validateTemplate);

  assert(getDashboardTemplate("armenia-overview")?.id === armeniaTemplate.id, "armenia template lookup failed");
  assert(getDashboardTemplate("plan-fact")?.id === planFactTemplate.id, "plan-fact template lookup failed");
  assert(getDashboardTemplateForScope({ country: "armenia" }).id === armeniaTemplate.id, "scope resolver armenia failed");
  assert(getDashboardTemplateForScope({ country: "russia" }).id === russiaTemplate.id, "scope resolver russia failed");
  assert(getDashboardTemplateForScope({ country: "all" }).id === overviewAllTemplate.id, "scope resolver all failed");
  assert(getDashboardTemplateForScope({ country: "armenia", tvMode: true }).id === tvArmeniaTemplate.id, "scope resolver tv failed");

  const requiredSections = {
    [armeniaTemplate.id]: ["executive_summary", "plan_fact", "forecast"],
    [planFactTemplate.id]: ["plan_fact"],
    [forecastTemplate.id]: ["forecast"],
  };

  for (const [templateId, sections] of Object.entries(requiredSections)) {
    const template = getDashboardTemplate(templateId);
    assert(template, `missing template ${templateId}`);
    const keys = new Set(template.sections.map((section) => section.key));
    for (const key of sections) {
      assert(keys.has(key), `template ${templateId} missing required section ${key}`);
    }
  }

  const composed = await composeDashboardData(armeniaTemplate, {
    ...armeniaTemplate.defaultFilters,
    country: "armenia",
    dateRange: { from: "2026-05-01", to: "2026-05-31" },
  });
  assert(typeof composed.templateId === "string", "composer must return templateId");
  assert(typeof composed.generatedAt === "string", "composer must return generatedAt");
  assert(composed.sections && typeof composed.sections === "object", "composer must return sections object");

  let fallbackLoads = 0;
  let fallbackPromise = null;
  await composeDashboardData(planFactTemplate, planFactTemplate.defaultFilters, {
    getPlanFactFallback: () => {
      if (!fallbackPromise) {
        fallbackLoads += 1;
        fallbackPromise = getPlanFactDashboardData({ source: "static-json" });
      }
      return fallbackPromise;
    },
  });
  assert(fallbackLoads === 1, "composer should reuse plan-fact fallback within one composition");

  console.log("Dashboard template checks passed.");
}

run().catch((error) => {
  console.error(`Dashboard template checks failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
