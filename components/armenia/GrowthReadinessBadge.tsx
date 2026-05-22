import { formatPercent } from "@/lib/formatters";
import type { ArmeniaGrowthReadinessResult } from "@/lib/calculations/armeniaGrowth";

const toneClass = {
  good: "bg-emerald-50 text-positive ring-emerald-100",
  warning: "bg-amber-50 text-warning ring-amber-100",
  bad: "bg-red-50 text-negative ring-red-100",
};

export function GrowthReadinessBadge({ status }: { status: ArmeniaGrowthReadinessResult }) {
  return (
    <div className={`rounded-lg px-4 py-3 ring-1 ${toneClass[status.tone]}`}>
      <div className="text-xs font-black uppercase tracking-[0.08em]">Growth readiness</div>
      <div className="mt-1 text-lg font-black">{status.label}</div>
      <div className="mt-1 text-sm font-semibold">{status.description}</div>
      <div className="mt-2 grid gap-1 text-xs font-black">
        <span>Статус: {status.status}</span>
        <span>Текущий EBITDA: {formatPercent(status.currentEbitdaMargin)}</span>
        <span>Серия выше 15%: {status.streak} мес.</span>
      </div>
    </div>
  );
}
