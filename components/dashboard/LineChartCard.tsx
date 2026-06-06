import { deviationIcon, formatDeviation, isGoodDeviation } from "@/lib/calculations/variance";
import { formatMoneyShort, formatPercent } from "@/lib/formatters";
import type { DashboardMetric } from "@/types/dashboard";

type LineChartCardProps = {
  title: string;
  description: string;
  metric: DashboardMetric;
  revenueMetric?: DashboardMetric;
  mode?: "money" | "share";
  color?: string;
};

function chartPath(values: number[], x: (index: number) => number, y: (value: number) => number): string {
  return values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
}

export function LineChartCard({
  title,
  description,
  metric,
  revenueMetric,
  mode = "money",
  color = "#0B5CAD",
}: LineChartCardProps) {
  const isShare = mode === "share";
  const planValues = metric.series.map((point, index) =>
    isShare && revenueMetric ? point.plan / revenueMetric.series[index].plan : point.plan,
  );
  const factValues = metric.series.map((point, index) =>
    isShare && revenueMetric ? point.fact / revenueMetric.series[index].fact : point.fact,
  );
  const allValues = [...planValues, ...factValues].filter(Number.isFinite);
  let min = Math.min(...allValues);
  let max = Math.max(...allValues);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  min -= span * 0.14;
  max += span * 0.14;

  const width = 760;
  const height = 300;
  const pad = { l: 62, r: 26, t: 30, b: 44 };
  const x = (index: number) => pad.l + index * ((width - pad.l - pad.r) / (metric.series.length - 1));
  const y = (value: number) => pad.t + (max - value) * ((height - pad.t - pad.b) / (max - min));
  const ticks = [0, 1, 2, 3, 4].map((index) => min + ((max - min) * index) / 4);
  const formatAxis = (value: number) => (isShare ? formatPercent(value) : formatMoneyShort(value));
  const good = isGoodDeviation(metric);

  return (
    <article className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-navy">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className={`rounded-md border px-3 py-2 text-sm font-black ${good ? "border-emerald-100 bg-emerald-50 text-positive" : "border-red-100 bg-red-50 text-negative"}`}>
          {deviationIcon(metric)} {formatDeviation(metric)}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full rounded-lg bg-white" role="img" aria-label={title}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.l} y1={y(tick)} x2={width - pad.r} y2={y(tick)} stroke="#E2E8F0" />
            <text x={pad.l - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#64748B">
              {formatAxis(tick)}
            </text>
          </g>
        ))}
        <path d={chartPath(planValues, x, y)} fill="none" stroke="#CBD5E1" strokeDasharray="8 8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <path d={chartPath(factValues, x, y)} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {factValues.map((value, index) => (
          <g key={`${metric.key}-${metric.series[index].month}`}>
            <circle cx={x(index)} cy={y(value)} r="4.5" fill={color} />
            <rect x={x(index) - 31} y={y(value) - 31} width="62" height="22" rx="6" fill={color} opacity="0.95" />
            <text x={x(index)} y={y(value) - 15} textAnchor="middle" fontSize="12" fontWeight="800" fill="#FFFFFF">
              {isShare ? formatPercent(value) : formatMoneyShort(value)}
            </text>
          </g>
        ))}
        {metric.series.map((point, index) => (
          <text key={point.month} x={x(index)} y={height - 16} textAnchor="middle" fontSize="13" fill="#111827">
            {point.month}
          </text>
        ))}
        <g transform={`translate(${pad.l}, 5)`}>
          <circle cx="0" cy="7" r="5" fill="#CBD5E1" />
          <text x="12" y="11" fontSize="13" fill="#475569">
            План
          </text>
          <circle cx="72" cy="7" r="5" fill={color} />
          <text x="84" y="11" fontSize="13" fill="#475569">
            Факт
          </text>
        </g>
      </svg>
    </article>
  );
}
