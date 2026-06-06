import { formatPercent } from "@/lib/formatters";
import type { ArmeniaGrowthReadinessResult } from "@/lib/calculations/armeniaGrowth";

const toneClass = {
  good: "border-emerald-100 bg-emerald-50 text-positive ring-emerald-100",
  warning: "border-amber-100 bg-amber-50 text-warning ring-amber-100",
  bad: "border-red-100 bg-red-50 text-negative ring-red-100",
};

export function GrowthReadinessBadge({ status }: { status: ArmeniaGrowthReadinessResult }) {
  return (
    <div className={`rounded-lg border px-5 py-4 shadow-sm ring-1 ${toneClass[status.tone]}`}>
      <div className="text-xs font-black uppercase tracking-[0.08em]">Growth readiness</div>
      <div className="mt-2 text-xl font-black">{status.label}</div>
      <div className="mt-2 text-sm font-semibold leading-6">{status.description}</div>
      <div className="mt-4 grid gap-2 text-xs font-black sm:grid-cols-3 lg:grid-cols-1">
        <span className="rounded-md bg-white/70 px-2.5 py-1.5">Статус: {status.status}</span>
        <span className="rounded-md bg-white/70 px-2.5 py-1.5">Текущий EBITDA: {formatPercent(status.currentEbitdaMargin)}</span>
        <span className="rounded-md bg-white/70 px-2.5 py-1.5">Серия выше 15%: {status.streak} мес.</span>
      </div>
    </div>
  );
}
