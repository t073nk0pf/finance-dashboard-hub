type StatusBadgeProps = {
  children: React.ReactNode;
  tone: "good" | "bad" | "warning" | "neutral";
};

const toneClass = {
  good: "bg-emerald-50 text-positive",
  bad: "bg-red-50 text-negative",
  warning: "bg-amber-50 text-warning",
  neutral: "bg-slate-100 text-muted",
};

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black ${toneClass[tone]}`}>{children}</span>;
}
