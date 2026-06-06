type StatusBadgeProps = {
  children: React.ReactNode;
  tone: "good" | "bad" | "warning" | "neutral";
};

const toneClass = {
  good: "border-emerald-100 bg-emerald-50 text-positive",
  bad: "border-red-100 bg-red-50 text-negative",
  warning: "border-amber-100 bg-amber-50 text-warning",
  neutral: "border-slate-200 bg-slate-100 text-muted",
};

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-black ${toneClass[tone]}`}>{children}</span>;
}
