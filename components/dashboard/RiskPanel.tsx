import { getActualShareDeviationPp } from "@/lib/calculations/variance";
import { money, percent, pp } from "@/lib/formatters";
import type { ExpenseVarianceItem } from "@/types/dashboard";

type RiskPanelProps = {
  items: ExpenseVarianceItem[];
};

export function RiskPanel({ items }: RiskPanelProps) {
  const risks = items.slice(0, 3);

  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h2 className="text-xl font-black text-navy">Что требует внимания</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Топ-3 негативных статей по росту доли факта относительно плана.</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {risks.map((item) => (
          <article key={`${item.row}-${item.label}`} className="rounded-lg border border-red-100 bg-red-50/80 p-4 shadow-sm">
            <div className="text-sm font-black text-negative">{item.label}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md border border-red-100 bg-white px-2.5 py-1 text-xs font-black text-negative">
                {pp(getActualShareDeviationPp(item))}
              </span>
              <span className="rounded-md border border-red-100 bg-white px-2.5 py-1 text-xs font-black text-negative">{money(item.delta)}</span>
            </div>
            <div className="mt-3 text-xs font-semibold leading-5 text-slate-600">{item.path}</div>
            <div className="mt-3 text-xs text-slate-500">
              План: {percent(item.planShare)} · факт: {percent(item.factShare)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
