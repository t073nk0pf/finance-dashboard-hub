type TvKpiCardProps = {
  label: string;
  value: string;
  sublabel: string;
  tone?: "good" | "bad" | "warning" | "neutral";
};

const toneClass = {
  good: "text-positive",
  bad: "text-negative",
  warning: "text-warning",
  neutral: "text-ink",
};

export function TvKpiCard({ label, value, sublabel, tone = "neutral" }: TvKpiCardProps) {
  return (
    <article className="rounded-lg border border-line bg-surface p-7 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <div className="text-sm font-black uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={`mt-5 font-mono text-5xl font-black leading-none lg:text-6xl ${toneClass[tone]}`}>{value}</div>
      <div className="mt-4 text-lg font-bold leading-snug text-muted">{sublabel}</div>
    </article>
  );
}
