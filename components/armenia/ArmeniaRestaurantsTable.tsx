import { formatMoney, formatPercent } from "@/lib/formatters";
import type { ArmeniaDashboardData } from "@/types/armenia";

export function ArmeniaRestaurantsTable({ data }: { data: ArmeniaDashboardData }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-soft">
      <h2 className="text-xl font-black text-navy">Рестораны Армении</h2>
      <div className="mt-5 overflow-x-auto border-t-2 border-accent">
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
              <tr key={restaurant.name} className="border-b border-line last:border-b-0">
                <td className="px-3 py-3 font-black">{restaurant.name}</td>
                <td className="px-3 py-3 text-right">{formatMoney(restaurant.revenue)}</td>
                <td className={`px-3 py-3 text-right font-black ${restaurant.ebitdaMargin >= 0.15 ? "text-positive" : "text-negative"}`}>
                  {formatPercent(restaurant.ebitdaMargin)}
                </td>
                <td className="px-3 py-3 text-right">{formatPercent(restaurant.foodCostShare)}</td>
                <td className={`px-3 py-3 text-right font-black ${restaurant.status === "leader" ? "text-positive" : restaurant.status === "stable" ? "text-accent" : "text-warning"}`}>
                  {restaurant.status === "leader" ? "лидер" : restaurant.status === "stable" ? "стабильно" : "наблюдение"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
