import { formatMoney, formatPercent } from "@/lib/formatters";
import type { ArmeniaDashboardData } from "@/types/armenia";

export function ArmeniaProfitabilityDashboard({ data }: { data: ArmeniaDashboardData }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-soft">
      <h2 className="text-xl font-black text-navy">Прибыльность Армении</h2>
      <div className="mt-5 overflow-x-auto border-t-2 border-accent">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface2 text-xs uppercase tracking-[0.06em] text-accent">
              <th className="px-3 py-3 text-left">Месяц</th>
              <th className="px-3 py-3 text-right">Выручка</th>
              <th className="px-3 py-3 text-right">EBITDA</th>
              <th className="px-3 py-3 text-right">EBITDA %</th>
              <th className="px-3 py-3 text-right">Net profit</th>
            </tr>
          </thead>
          <tbody>
            {data.monthlySeries.map((snapshot) => (
              <tr key={snapshot.monthKey} className="border-b border-line last:border-b-0">
                <td className="px-3 py-3 font-black">{snapshot.month}</td>
                <td className="px-3 py-3 text-right">{formatMoney(snapshot.revenue)}</td>
                <td className="px-3 py-3 text-right">{formatMoney(snapshot.ebitda)}</td>
                <td className={`px-3 py-3 text-right font-black ${snapshot.ebitdaMargin >= 0.15 ? "text-positive" : "text-negative"}`}>
                  {formatPercent(snapshot.ebitdaMargin)}
                </td>
                <td className="px-3 py-3 text-right">{formatMoney(snapshot.netProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
