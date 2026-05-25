import type { ArmeniaDashboardData } from "@/types/armenia";

export function EbitdaThresholdPanel({ data }: { data: ArmeniaDashboardData }) {
  const rules = [
    { label: "EBITDA < 15%", value: "Развитие не запускается", tone: "text-negative" },
    { label: "2 месяца >= 15%", value: "Предварительный сигнал", tone: "text-warning" },
    { label: "3 месяца >= 15%", value: "Устойчивая готовность", tone: "text-positive" },
    { label: "17-18%", value: "Ускоренный сценарий", tone: "text-positive" },
  ];

  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <div className="inline-flex rounded-md border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-accent">
        Decision card
      </div>
      <h2 className="mt-3 text-xl font-black text-navy">Порог развития</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        {data.growthReadiness.excludedMonthKeys.join(", ")} исключается из оценки готовности; порог запуска - 15% EBITDA.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rules.map((rule) => (
          <div key={rule.label} className="rounded-lg border border-line bg-surface2 p-4 shadow-sm">
            <div className="text-sm font-black text-slate-700">{rule.label}</div>
            <div className={`mt-1 text-sm font-black ${rule.tone}`}>{rule.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
