"use client";

type TopFilterBarProps = {
  period?: string;
  legalEntities?: number | string;
  accent?: "default" | "armenia";
};

export function TopFilterBar({ period = "январь-апрель 2026", legalEntities = 6, accent = "default" }: TopFilterBarProps) {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface2 px-4 py-3">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Рабочий контекст</div>
        <div className="mt-1 text-sm font-black text-ink">Период: {period}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-bold text-ink shadow-sm">Юрлица: {legalEntities}</div>
        <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-bold text-ink shadow-sm">Сценарий: Base</div>
        <button
          className={`rounded-md px-4 py-2 text-sm font-black text-white shadow-sm transition hover:brightness-95 focus-visible:ring-4 focus-visible:ring-primary/20 ${
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
