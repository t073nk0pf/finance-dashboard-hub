import type { ArmeniaMonthlySnapshot } from "@/types/armenia";

export type GrowthReadinessStatus = {
  label: string;
  tone: "good" | "warning" | "bad";
  description: string;
  streak: number;
};

export function getEbitdaReadinessStatus(snapshots: ArmeniaMonthlySnapshot[]): GrowthReadinessStatus {
  const eligible = snapshots.filter((snapshot) => snapshot.monthKey !== "2026-05");
  const latest = eligible.at(-1);

  if (!latest || latest.ebitdaMargin < 0.15) {
    return {
      label: "Развитие не запускается",
      tone: "bad",
      description: "EBITDA ниже порога 15%, май 2026 исключен из оценки.",
      streak: 0,
    };
  }

  let streak = 0;
  for (let index = eligible.length - 1; index >= 0; index -= 1) {
    if (eligible[index].ebitdaMargin >= 0.15) streak += 1;
    else break;
  }

  if (latest.ebitdaMargin >= 0.17) {
    return {
      label: "Ускоренный сценарий",
      tone: "good",
      description: "EBITDA в зоне 17-18%, можно моделировать более быстрый рост.",
      streak,
    };
  }

  if (streak >= 3) {
    return {
      label: "Устойчивая готовность",
      tone: "good",
      description: "EBITDA держится выше 15% три месяца подряд.",
      streak,
    };
  }

  if (streak >= 2) {
    return {
      label: "Предварительный сигнал",
      tone: "warning",
      description: "Есть два месяца подряд выше 15%, нужен еще один месяц подтверждения.",
      streak,
    };
  }

  return {
    label: "Наблюдение",
    tone: "warning",
    description: "Порог 15% достигнут, но устойчивость еще не подтверждена.",
    streak,
  };
}
