import { formatMoney, formatPercent } from "@/lib/formatters";
import type { ArmeniaDashboardData } from "@/types/armenia";

export function ArmeniaUnitEconomicsDashboard({ data }: { data: ArmeniaDashboardData }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-soft">
      <h2 className="text-xl font-black text-navy">Unit economics</h2>
      <p className="mt-1 text-sm leading-6 text-muted">Демо-структура для будущей загрузки юнит-экономики по ресторанам.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface2 p-4">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Food Cost</div>
          <div className={`mt-2 text-2xl font-black ${data.unitEconomics.foodCostFactShare <= data.unitEconomics.foodCostPlanShare ? "text-positive" : "text-negative"}`}>
            {formatPercent(data.unitEconomics.foodCostFactShare)}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface2 p-4">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">UC</div>
          <div className={`mt-2 text-2xl font-black ${data.unitEconomics.ucFactShare <= data.unitEconomics.ucPlanShare ? "text-positive" : "text-negative"}`}>
            {formatPercent(data.unitEconomics.ucFactShare)}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-surface2 p-4">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Списания</div>
          <div className={`mt-2 text-2xl font-black ${data.unitEconomics.writeOffShare <= data.unitEconomics.writeOffPlanShare ? "text-positive" : "text-negative"}`}>
            {formatPercent(data.unitEconomics.writeOffShare)}
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {data.restaurants.slice(0, 3).map((restaurant) => (
          <article key={restaurant.name} className="rounded-lg border border-line bg-surface2 p-4">
            <h3 className="font-black text-navy">{restaurant.name}</h3>
            <div className="mt-4 grid gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Выручка</span>
                <b>{formatMoney(restaurant.revenue)}</b>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">EBITDA</span>
                <b className={restaurant.ebitdaMargin >= 0.15 ? "text-positive" : "text-negative"}>{formatPercent(restaurant.ebitdaMargin)}</b>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Food Cost</span>
                <b>{formatPercent(restaurant.foodCostShare)}</b>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
