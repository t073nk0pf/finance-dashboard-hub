import { TvKpiCard } from "@/components/tv/TvKpiCard";
import { TvSlideRotator } from "@/components/tv/TvSlideRotator";
import { TvStatusPanel } from "@/components/tv/TvStatusPanel";
import { calculateArmeniaGrowthReadiness } from "@/lib/calculations/armeniaGrowth";
import { formatMoney, formatPercent } from "@/lib/formatters";
import type { ArmeniaDashboardData } from "@/types/armenia";

export function OfficeTvLayout({ data }: { data: ArmeniaDashboardData }) {
  const readiness = calculateArmeniaGrowthReadiness(data.monthlySeries, data.growthReadiness);
  const { kpis } = data;

  return (
    <main className="tv-theme min-h-screen bg-bg p-6 text-ink lg:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1800px] flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.16em] text-accent">Office TV</div>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-ink lg:text-6xl">Armenia Finance Pulse</h1>
          </div>
          <div className="rounded-lg border border-line bg-surface px-4 py-3 text-right text-sm font-bold text-muted">
            Не содержит чувствительной детализации
            <br />
            Auto-refresh: placeholder
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-4">
          <TvKpiCard label="Выручка" value={formatMoney(kpis.revenue)} sublabel={data.period.latestMonth} tone="neutral" />
          <TvKpiCard label="EBITDA" value={formatMoney(kpis.ebitda)} sublabel={formatPercent(kpis.ebitdaMargin)} tone={kpis.ebitdaMargin >= 0.15 ? "good" : kpis.ebitdaMargin >= 0.12 ? "warning" : "bad"} />
          <TvKpiCard label="Пиццерии" value={String(kpis.restaurants)} sublabel="активная сеть" tone="neutral" />
          <TvKpiCard label="Growth" value={formatPercent(readiness.currentEbitdaMargin)} sublabel={readiness.label} tone={readiness.tone === "good" ? "good" : readiness.tone === "warning" ? "warning" : "bad"} />
        </section>

        <div className="grid flex-1 gap-5 xl:grid-cols-[1fr_520px]">
          <TvSlideRotator data={data} readiness={readiness} />
          <TvStatusPanel data={data} readiness={readiness} />
        </div>
      </div>
    </main>
  );
}
