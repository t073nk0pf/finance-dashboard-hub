"use client";

type TopFilterBarProps = {
  period?: string;
  legalEntities?: number | string;
  accent?: "default" | "armenia";
};

export function TopFilterBar({ period = "январь-апрель 2026", legalEntities = 6, accent = "default" }: TopFilterBarProps) {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-soft">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Рабочий контекст</div>
        <div className="mt-1 text-sm font-bold text-ink">Период: {period}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-line bg-surface2 px-3 py-2 text-sm font-bold text-ink">Юрлица: {legalEntities}</div>
        <div className="rounded-lg border border-line bg-surface2 px-3 py-2 text-sm font-bold text-ink">Сценарий: Base</div>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-black text-white ${
            accent === "armenia" ? "bg-accent" : "bg-navy"
          }`}
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
        >
          Печать / PDF
        </button>
      </div>
    </div>
  );
}
