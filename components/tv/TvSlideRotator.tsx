"use client";

import { useEffect, useState } from "react";
import { formatMoney, formatPercent } from "@/lib/formatters";
import type { ArmeniaGrowthReadinessResult } from "@/lib/calculations/armeniaGrowth";
import type { ArmeniaDashboardData } from "@/types/armenia";

export function TvSlideRotator({ data, readiness }: { data: ArmeniaDashboardData; readiness: ArmeniaGrowthReadinessResult }) {
  const [index, setIndex] = useState(0);
  const leaders = data.restaurants.filter((restaurant) => restaurant.status === "leader").length;
  const watch = data.restaurants.filter((restaurant) => restaurant.status === "watch").length;
  const slides = [
    { title: "Общий статус Армении", body: `Выручка ${formatMoney(data.kpis.revenue)}, EBITDA ${formatPercent(data.kpis.ebitdaMargin)}, сеть ${data.kpis.restaurants} пиццерий.` },
    { title: "EBITDA и прибыльность", body: `EBITDA ${formatMoney(data.kpis.ebitda)}, чистая прибыль ${formatMoney(data.kpis.netProfit)}. Порог развития 15%.` },
    { title: "Пиццерии", body: `Лидеры: ${leaders}. Зона внимания: ${watch}. На TV показываются только агрегированные статусы.` },
    { title: "UC / Food Cost / списания", body: `Food Cost ${formatPercent(data.unitEconomics.foodCostFactShare)}, UC ${formatPercent(data.unitEconomics.ucFactShare)}, списания ${formatPercent(data.unitEconomics.writeOffShare)}.` },
    { title: "Готовность к развитию сети", body: `${readiness.label}. Серия выше 15%: ${readiness.streak} месяца.` },
  ];
  const slideCount = slides.length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % slideCount);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [slideCount]);

  const slide = slides[index];

  return (
    <section className="rounded-lg border border-line bg-surface2 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.12em] text-accent">Slide {index + 1} / {slides.length}</div>
          <h2 className="mt-6 text-5xl font-black leading-tight text-ink lg:text-7xl">{slide.title}</h2>
          <p className="mt-6 max-w-5xl text-3xl font-bold leading-snug text-muted lg:text-5xl">{slide.body}</p>
        </div>
        <div className="hidden h-24 w-24 place-items-center rounded-full border border-line bg-surface text-3xl font-black text-accent sm:grid">
          TV
        </div>
      </div>
    </section>
  );
}
