import type { ArmeniaGrowthReadinessConfig, ArmeniaMonthlySnapshot } from "@/types/armenia";

export type ArmeniaGrowthReadinessStatus = "not_ready" | "preparation_signal" | "ready" | "accelerated_growth";

export type ArmeniaGrowthReadinessResult = {
  status: ArmeniaGrowthReadinessStatus;
  label: string;
  tone: "good" | "warning" | "bad";
  description: string;
  currentEbitdaMargin: number;
  streak: number;
  excludedMonthKeys: string[];
};

const defaultConfig: ArmeniaGrowthReadinessConfig = {
  threshold: 0.15,
  acceleratedThreshold: 0.17,
  excludedMonthKeys: ["2026-05"],
};

export function calculateArmeniaGrowthReadiness(
  snapshots: ArmeniaMonthlySnapshot[],
  config: Partial<ArmeniaGrowthReadinessConfig> = {},
): ArmeniaGrowthReadinessResult {
  const readinessConfig = { ...defaultConfig, ...config };
  const eligible = snapshots.filter((snapshot) => !readinessConfig.excludedMonthKeys.includes(snapshot.monthKey));
  const latest = eligible.at(-1);

  if (!latest || latest.ebitdaMargin < readinessConfig.threshold) {
    return {
      status: "not_ready",
      label: "Развитие не запускается",
      tone: "bad",
      description: "EBITDA ниже порога 15%, запуск развития пока не подтвержден.",
      currentEbitdaMargin: latest?.ebitdaMargin ?? 0,
      streak: 0,
      excludedMonthKeys: readinessConfig.excludedMonthKeys,
    };
  }

  let streak = 0;
  for (let index = eligible.length - 1; index >= 0; index -= 1) {
    if (eligible[index].ebitdaMargin >= readinessConfig.threshold) {
      streak += 1;
    } else {
      break;
    }
  }

  if (latest.ebitdaMargin >= readinessConfig.acceleratedThreshold) {
    return {
      status: "accelerated_growth",
      label: "Ускоренный сценарий",
      tone: "good",
      description: "EBITDA в зоне 17-18%, можно готовить ускоренный сценарий развития.",
      currentEbitdaMargin: latest.ebitdaMargin,
      streak,
      excludedMonthKeys: readinessConfig.excludedMonthKeys,
    };
  }

  if (streak >= 3) {
    return {
      status: "ready",
      label: "Устойчивая готовность",
      tone: "good",
      description: "EBITDA держится выше 15% три месяца подряд, развитие можно рассматривать.",
      currentEbitdaMargin: latest.ebitdaMargin,
      streak,
      excludedMonthKeys: readinessConfig.excludedMonthKeys,
    };
  }

  return {
    status: "preparation_signal",
    label: streak >= 2 ? "Предварительный сигнал" : "Порог достигнут",
    tone: "warning",
    description:
      streak >= 2
        ? "Есть два месяца подряд выше 15%, можно начинать подготовку без запуска развития."
        : "EBITDA выше 15%, но устойчивость еще не подтверждена.",
    currentEbitdaMargin: latest.ebitdaMargin,
    streak,
    excludedMonthKeys: readinessConfig.excludedMonthKeys,
  };
}
