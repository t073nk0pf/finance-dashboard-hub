import { calculateArmeniaGrowthReadiness } from "@/lib/calculations/armeniaGrowth";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { GrowthReadinessBadge } from "@/components/armenia/GrowthReadinessBadge";
import { EbitdaThresholdPanel } from "@/components/armenia/EbitdaThresholdPanel";
import type { ArmeniaDashboardData } from "@/types/armenia";

function ebitdaTone(value: number) {
  if (value >= 0.15) return "text-positive";
  if (value >= 0.12) return "text-warning";
  return "text-negative";
}

function costTone(fact: number, plan: number) {
  return fact <= plan ? "text-positive" : "text-negative";
}

export function ArmeniaOverviewDashboard({ data }: { data: ArmeniaDashboardData }) {
  const { kpis } = data;
  const status = calculateArmeniaGrowthReadiness(data.monthlySeries, data.growthReadiness);
  const cards = [
    { label: "Выручка", value: formatMoney(kpis.revenue), tone: "text-navy" },
    { label: "EBITDA", value: formatMoney(kpis.ebitda), tone: "text-navy" },
    { label: "EBITDA %", value: formatPercent(kpis.ebitdaMargin), tone: ebitdaTone(kpis.ebitdaMargin) },
    { label: "Чистая прибыль", value: formatMoney(kpis.netProfit), tone: "text-navy" },
    { label: "Food Cost / UC", value: `${formatPercent(kpis.foodCostShare)} / ${formatPercent(kpis.ucShare)}`, tone: costTone(kpis.foodCostShare, kpis.foodCostPlanShare) },
    { label: "Opex %", value: formatPercent(kpis.opexShare), tone: "text-navy" },
    { label: "Пиццерии", value: String(kpis.restaurants), tone: "text-navy" },
    { label: "Средняя выручка", value: formatMoney(kpis.averageRevenuePerRestaurant), tone: "text-navy" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg border border-line bg-surface p-5 shadow-card">
            <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">{card.label}</div>
            <div className={`mt-3 font-mono text-2xl font-black ${card.tone}`}>{card.value}</div>
          </article>
        ))}
      </div>
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <h2 className="text-xl font-black text-navy">Executive summary</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Армения закрывает {data.period.latestMonth} с EBITDA {formatPercent(kpis.ebitdaMargin)} и чистой прибылью {formatMoney(kpis.netProfit)}.
            Food Cost и UC ниже плановых уровней, но зона внимания остается на ресторанах с EBITDA ниже 15%.
          </p>
          <div className="mt-5 h-48 rounded-lg border border-line bg-surface2 p-4 shadow-sm">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">EBITDA % по месяцам</div>
            <div className="flex h-32 items-end gap-3">
              {data.monthlySeries.map((point) => (
                <div key={point.monthKey} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end rounded bg-white">
                    <div
                      className={`w-full rounded ${point.monthKey === "2026-05" ? "bg-slate-300" : point.ebitdaMargin >= 0.15 ? "bg-positive" : point.ebitdaMargin >= 0.12 ? "bg-warning" : "bg-negative"}`}
                      style={{ height: `${Math.max(point.ebitdaMargin * 420, 8)}%` }}
                    />
                  </div>
                  <div className="text-xs font-black text-muted">{point.month}</div>
                </div>
              ))}
            </div>
          </div>
        </article>
        <div className="space-y-5">
          <GrowthReadinessBadge status={status} />
          <article className="rounded-lg border border-line bg-surface p-5 shadow-card">
            <h2 className="text-xl font-black text-navy">Risk / status</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted">EBITDA threshold</span><b className={ebitdaTone(kpis.ebitdaMargin)}>{formatPercent(kpis.ebitdaMargin)}</b></div>
              <div className="flex justify-between gap-4"><span className="text-muted">Food Cost к плану</span><b className={costTone(kpis.foodCostShare, kpis.foodCostPlanShare)}>{formatPercent(kpis.foodCostShare)}</b></div>
              <div className="flex justify-between gap-4"><span className="text-muted">UC к плану</span><b className={costTone(kpis.ucShare, kpis.ucPlanShare)}>{formatPercent(kpis.ucShare)}</b></div>
            </div>
          </article>
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <h2 className="text-xl font-black text-navy">Готовность к развитию</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{status.description}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-surface2 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Порог</div>
              <div className="mt-2 text-2xl font-black text-accent">15%</div>
            </div>
            <div className="rounded-lg border border-line bg-surface2 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Серия</div>
              <div className="mt-2 text-2xl font-black text-positive">{status.streak} мес.</div>
            </div>
            <div className="rounded-lg border border-line bg-surface2 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Исключено</div>
              <div className="mt-2 text-2xl font-black text-muted">{status.excludedMonthKeys.length}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Следующий управленческий шаг - подготовить сценарии открытия без фиксации запуска до подтверждения качества Food Cost, UC и ресторанов зоны внимания.
          </p>
        </article>
        <article className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <h2 className="text-xl font-black text-navy">Драйверы прибыльности</h2>
          <div className="mt-4 grid gap-3">
            {data.profitabilityDrivers.map((driver) => (
              <div key={driver.title} className="rounded-lg border border-line bg-surface2 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <b className="text-sm text-navy">{driver.title}</b>
                  <span className={driver.tone === "positive" ? "text-positive" : driver.tone === "warning" ? "text-warning" : "text-negative"}>{driver.value}</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-muted">{driver.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
      <EbitdaThresholdPanel data={data} />
    </div>
  );
}
