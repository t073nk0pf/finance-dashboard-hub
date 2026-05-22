import { getActualShareDeviationPp } from "@/lib/calculations/variance";
import { formatMoney, formatPercent, formatPp } from "@/lib/formatters";
import type { ExpenseVarianceItem } from "@/types/dashboard";

type VarianceListProps = {
  title: string;
  better: ExpenseVarianceItem[];
  worse: ExpenseVarianceItem[];
};

function VarianceItem({ item }: { item: ExpenseVarianceItem }) {
  const deviation = getActualShareDeviationPp(item);
  const good = deviation <= 0;
  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-lg border border-line bg-surface2 p-4">
      <div>
        <div className="font-black text-slate-800">{item.label}</div>
        <div className="mt-1 text-xs font-semibold leading-5 text-muted">{item.path}</div>
        <div className="mt-1 text-xs text-muted">
          План: {formatPercent(item.planShare)} · факт: {formatPercent(item.factShare)} · руб.: {formatMoney(item.delta)}
        </div>
      </div>
      <div className={`self-center text-lg font-black ${good ? "text-positive" : "text-negative"}`}>{formatPp(deviation)}</div>
    </article>
  );
}

export function VarianceList({ title, better, worse }: VarianceListProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-soft">
      <h2 className="text-xl font-black text-navy">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
        Показано фактическое отклонение доли: факт минус план. Отрицательное значение для расходов означает экономию доли.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-muted">Лучше плана</div>
          <div className="space-y-3">{better.map((item) => <VarianceItem key={`${item.row}-${item.label}`} item={item} />)}</div>
        </div>
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-muted">Вышли за рамки</div>
          <div className="space-y-3">{worse.map((item) => <VarianceItem key={`${item.row}-${item.label}`} item={item} />)}</div>
        </div>
      </div>
    </section>
  );
}
