import { formatPercent } from "@/lib/formatters";
import type { ArmeniaGrowthReadinessResult } from "@/lib/calculations/armeniaGrowth";
import type { ArmeniaDashboardData } from "@/types/armenia";

export function TvStatusPanel({ data, readiness }: { data: ArmeniaDashboardData; readiness: ArmeniaGrowthReadinessResult }) {
  const foodCostGood = data.unitEconomics.foodCostFactShare <= data.unitEconomics.foodCostPlanShare;
  const ucGood = data.unitEconomics.ucFactShare <= data.unitEconomics.ucPlanShare;

  return (
    <section className="rounded-lg border border-line bg-surface2 p-6">
      <div className="text-sm font-black uppercase tracking-[0.12em] text-muted">Операционный статус</div>
      <div className="mt-6 grid gap-6">
        <div>
          <div className={`text-5xl font-black ${readiness.tone === "good" ? "text-positive" : readiness.tone === "warning" ? "text-warning" : "text-negative"}`}>
            {readiness.status === "accelerated_growth" ? "FAST" : readiness.status === "ready" ? "READY" : readiness.status === "preparation_signal" ? "PREP" : "STOP"}
          </div>
          <div className="mt-2 text-xl text-muted">{readiness.label}</div>
        </div>
        <div>
          <div className={`text-5xl font-black ${foodCostGood && ucGood ? "text-positive" : "text-negative"}`}>
            {foodCostGood && ucGood ? "OK" : "WATCH"}
          </div>
          <div className="mt-2 text-xl text-muted">
            FC {formatPercent(data.unitEconomics.foodCostFactShare)} / UC {formatPercent(data.unitEconomics.ucFactShare)}
          </div>
        </div>
        <div>
          <div className="text-5xl font-black text-accent">5 мин</div>
          <div className="mt-2 text-xl text-muted">Auto-refresh placeholder</div>
        </div>
      </div>
    </section>
  );
}
