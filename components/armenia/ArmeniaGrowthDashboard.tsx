import { calculateArmeniaGrowthReadiness } from "@/lib/calculations/armeniaGrowth";
import { formatPercent } from "@/lib/formatters";
import { GrowthReadinessBadge } from "@/components/armenia/GrowthReadinessBadge";
import type { ArmeniaDashboardData } from "@/types/armenia";

export function ArmeniaGrowthDashboard({ data }: { data: ArmeniaDashboardData }) {
  const status = calculateArmeniaGrowthReadiness(data.monthlySeries, data.growthReadiness);

  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-xl font-black text-navy">Growth readiness</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Оценка строится на EBITDA %, май 2026 исключен из серии готовности.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.monthlySeries.map((snapshot) => (
              <article key={snapshot.monthKey} className="rounded-lg border border-line bg-surface2 p-4 shadow-sm">
                <div className="text-sm font-black text-slate-700">{snapshot.month}</div>
                <div className={`mt-2 text-2xl font-black ${snapshot.monthKey === "2026-05" ? "text-muted" : snapshot.ebitdaMargin >= 0.15 ? "text-positive" : "text-negative"}`}>
                  {formatPercent(snapshot.ebitdaMargin)}
                </div>
                <div className="mt-1 text-xs font-bold text-muted">{snapshot.monthKey === "2026-05" ? "исключен" : "в оценке"}</div>
              </article>
            ))}
          </div>
        </div>
        <GrowthReadinessBadge status={status} />
      </div>
    </section>
  );
}
