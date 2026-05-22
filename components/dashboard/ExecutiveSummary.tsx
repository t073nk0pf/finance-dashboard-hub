import { getActualShareDeviationPp, isMetricGood } from "@/lib/calculations/variance";
import { money, pp } from "@/lib/formatters";
import type { DashboardData, DashboardMetric, ExpenseVarianceItem } from "@/types/dashboard";

function metricLine(label: string, metric: DashboardMetric): string {
  const good = isMetricGood(metric);

  if (metric.kind === "expense_share") {
    const direction = good ? "лучше плана" : "хуже плана";
    return `${label} ${direction} на ${pp(getActualShareDeviationPp(metric))}.`;
  }

  const direction = good ? "выше плана" : "ниже плана";
  return `${label} ${direction} на ${money(metric.fact - metric.plan)}.`;
}

function driverLine(prefix: string, item: ExpenseVarianceItem | undefined): string | null {
  if (!item) return null;
  return `${prefix}: ${item.label} (${pp(getActualShareDeviationPp(item))}).`;
}

export function ExecutiveSummary({ data }: { data: DashboardData }) {
  const bullets = [
    metricLine("Выручка", data.metrics.revenue),
    metricLine("Opex", data.metrics.opex),
    metricLine("EBITDA", data.metrics.ebitda),
    metricLine("Чистая прибыль", data.metrics.netProfit),
    driverLine("Главный позитивный драйвер", data.expenseVariance.better[0]),
    driverLine("Главный негативный драйвер", data.expenseVariance.worse[0]),
  ].filter(Boolean);

  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-navy">Главные выводы</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Автоматическая сводка на основе план-факт данных и отклонений по долям.</p>
        </div>
        <span className="rounded-lg bg-surface2 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-primary">
          {data.source.period}
        </span>
      </div>
      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="rounded-lg border border-line bg-surface2 px-4 py-3 text-sm font-bold leading-6 text-slate-800">
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  );
}
