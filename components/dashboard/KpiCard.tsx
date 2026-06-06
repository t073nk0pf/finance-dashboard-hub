import { deviationIcon, formatDeviation, isGoodDeviation } from "@/lib/calculations/variance";
import { formatMoney, formatPercent } from "@/lib/formatters";
import type { DashboardMetric } from "@/types/dashboard";

type KpiCardProps = {
  title: string;
  metric: DashboardMetric;
  mode?: "money" | "share";
};

export function KpiCard({ title, metric, mode = "money" }: KpiCardProps) {
  const good = isGoodDeviation(metric);
  const value = mode === "share" ? formatPercent(metric.factShare) : formatMoney(metric.fact);
  const plan = mode === "share" ? formatPercent(metric.planShare) : formatMoney(metric.plan);
  const fact = mode === "share" ? formatPercent(metric.factShare) : formatMoney(metric.fact);

  return (
    <article className="min-h-40 rounded-lg border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-panel">
      <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</div>
      <div className="mt-4 font-mono text-[1.85rem] font-black leading-none text-navy">{value}</div>
      <div className="mt-4 text-sm font-semibold leading-6 text-muted">
        План: {plan}
        <br />
        Факт: {fact}
      </div>
      <div
        className={`mt-4 inline-flex rounded-md border px-2.5 py-1 text-sm font-black ${
          good ? "border-emerald-100 bg-emerald-50 text-positive" : "border-red-100 bg-red-50 text-negative"
        }`}
      >
        {deviationIcon(metric)} {formatDeviation(metric)}
      </div>
    </article>
  );
}
