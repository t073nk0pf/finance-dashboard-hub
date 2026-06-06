import { formatMoney, formatPercent, formatPp, formatRatio } from "@/lib/formatters";
import type { EntityDashboard } from "@/types/dashboard";

type EntityTableProps = {
  entities: EntityDashboard[];
};

export function EntityTable({ entities }: EntityTableProps) {
  const maxRevenue = Math.max(...entities.map((entity) => entity.revenueFact));

  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h2 className="text-xl font-black text-navy">Юрлица: выполнение плана</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Сравнение по первым листам-юрлицам. Пиццерии в отдельную разбивку не выводятся.</p>
      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface2 text-xs uppercase tracking-[0.06em] text-primary">
              <th className="px-3 py-3 text-left">Юрлицо</th>
              <th className="px-3 py-3 text-right">Выручка факт</th>
              <th className="px-3 py-3 text-right">К плану</th>
              <th className="px-3 py-3 text-right">Opex факт</th>
              <th className="px-3 py-3 text-right">Opex к плану</th>
              <th className="px-3 py-3 text-right">EBITDA к плану</th>
              <th className="px-3 py-3 text-right">Чистая прибыль к плану</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((entity) => {
              const revenueGood = entity.revenueDelta >= 0;
              const opexGood = entity.opexDeltaPp <= 0;
              const ebitdaGood = entity.ebitdaDelta >= 0;
              const netGood = entity.netProfitDelta >= 0;
              return (
                <tr key={entity.sheet} className="border-b border-line transition hover:bg-blue-50/40 last:border-b-0">
                  <td className="px-3 py-3 text-left font-black">{entity.name}</td>
                  <td className="min-w-56 px-3 py-3 text-right">
                    <div className="font-mono font-black">{formatMoney(entity.revenueFact)}</div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(4, (entity.revenueFact / maxRevenue) * 100)}%` }} />
                    </div>
                  </td>
                  <td className={`px-3 py-3 text-right font-bold ${revenueGood ? "text-positive" : "text-negative"}`}>
                    {formatRatio(entity.revenueRatio)}
                    <br />
                    <span className="font-normal text-muted">{formatMoney(entity.revenueDelta)}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {formatPercent(entity.opexFactShare)}
                    <br />
                    <span className="text-muted">{formatMoney(entity.opexFact)}</span>
                  </td>
                  <td className={`px-3 py-3 text-right font-bold ${opexGood ? "text-positive" : "text-negative"}`}>
                    {formatPp(entity.opexDeltaPp)}
                  </td>
                  <td className={`px-3 py-3 text-right font-bold ${ebitdaGood ? "text-positive" : "text-negative"}`}>
                    {formatMoney(entity.ebitdaDelta)}
                  </td>
                  <td className={`px-3 py-3 text-right font-bold ${netGood ? "text-positive" : "text-negative"}`}>
                    {formatMoney(entity.netProfitDelta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
