import { getActualShareDeviationPp } from "@/lib/calculations/variance";
import { formatMoney, formatPercent, formatPp } from "@/lib/formatters";
import type { EntityDashboard, ExpenseVarianceItem } from "@/types/dashboard";

type EntityCardsProps = {
  entities: EntityDashboard[];
};

function MiniExpenseRows({ items }: { items: ExpenseVarianceItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const deviation = getActualShareDeviationPp(item);
        return (
          <div key={`${item.row}-${item.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
            <span className="truncate text-slate-700">{item.label}</span>
            <b className={deviation <= 0 ? "text-positive" : "text-negative"}>{formatPp(deviation)}</b>
          </div>
        );
      })}
    </div>
  );
}

export function EntityCards({ entities }: EntityCardsProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h2 className="text-xl font-black text-navy">Расходы по юрлицам</h2>
      <p className="mt-1 text-sm leading-6 text-muted">В каждом блоке: самые успешные статьи расходов и статьи, где доля факта оказалась выше плановой.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {entities.map((entity) => {
          const revenueGood = entity.revenueDelta >= 0;
          const opexGood = entity.opexDeltaPp <= 0;
          return (
            <article key={entity.sheet} className="rounded-lg border border-line bg-surface2 p-4 shadow-sm transition hover:bg-white">
              <h3 className="text-lg font-black text-navy">{entity.name}</h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Выручка</div>
                  <div className="mt-1 font-black">{formatMoney(entity.revenueFact)}</div>
                </div>
                <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">К плану</div>
                  <div className={`mt-1 font-black ${revenueGood ? "text-positive" : "text-negative"}`}>{formatMoney(entity.revenueDelta)}</div>
                </div>
                <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Opex факт</div>
                  <div className="mt-1 font-black">{formatPercent(entity.opexFactShare)}</div>
                </div>
                <div className="rounded-lg border border-line bg-surface p-3 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Opex откл.</div>
                  <div className={`mt-1 font-black ${opexGood ? "text-positive" : "text-negative"}`}>{formatPp(entity.opexDeltaPp)}</div>
                </div>
              </div>
              <div className="mt-4 text-xs font-black uppercase tracking-[0.06em] text-muted">Сэкономили долю</div>
              <div className="mt-2">
                <MiniExpenseRows items={entity.betterExpenses} />
              </div>
              <div className="mt-4 text-xs font-black uppercase tracking-[0.06em] text-muted">Вышли выше плана</div>
              <div className="mt-2">
                <MiniExpenseRows items={entity.worseExpenses} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
