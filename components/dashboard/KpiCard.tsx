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
    <article className="min-h-36 rounded-lg border border-line bg-surface p-4 shadow-soft">
      <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</div>
      <div className="mt-4 text-3xl font-black text-navy">{value}</div>
      <div className="mt-3 text-sm leading-5 text-muted">
        План: {plan}
        <br />
        Факт: {fact}
      </div>
      <div
        className={`mt-4 inline-flex rounded-lg px-2.5 py-1 text-sm font-black ${
          good ? "bg-emerald-50 text-positive" : "bg-red-50 text-negative"
        }`}
      >
        {deviationIcon(metric)} {formatDeviation(metric)}
      </div>
    </article>
  );
}
