import { formatMoney, formatPercent } from "@/lib/formatters";
import type { ArmeniaDashboardData } from "@/types/armenia";

export function ArmeniaRestaurantsTable({ data }: { data: ArmeniaDashboardData }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <h2 className="text-xl font-black text-navy">Рестораны Армении</h2>
      <div className="mt-5 overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface2 text-xs uppercase tracking-[0.06em] text-accent">
              <th className="px-3 py-3 text-left">Ресторан</th>
              <th className="px-3 py-3 text-right">Выручка</th>
              <th className="px-3 py-3 text-right">EBITDA %</th>
              <th className="px-3 py-3 text-right">Food Cost</th>
              <th className="px-3 py-3 text-right">Статус</th>
            </tr>
          </thead>
          <tbody>
            {data.restaurants.map((restaurant) => (
              <tr key={restaurant.name} className="border-b border-line transition hover:bg-orange-50/40 last:border-b-0">
                <td className="px-3 py-3 font-black">{restaurant.name}</td>
                <td className="px-3 py-3 text-right font-mono">{formatMoney(restaurant.revenue)}</td>
                <td className={`px-3 py-3 text-right font-black ${restaurant.ebitdaMargin >= 0.15 ? "text-positive" : "text-negative"}`}>
                  {formatPercent(restaurant.ebitdaMargin)}
                </td>
                <td className="px-3 py-3 text-right">{formatPercent(restaurant.foodCostShare)}</td>
                <td className="px-3 py-3 text-right">
                  <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-black ${restaurant.status === "leader" ? "border-emerald-100 bg-emerald-50 text-positive" : restaurant.status === "stable" ? "border-orange-100 bg-orange-50 text-accent" : "border-amber-100 bg-amber-50 text-warning"}`}>
                    {restaurant.status === "leader" ? "лидер" : restaurant.status === "stable" ? "стабильно" : "наблюдение"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
