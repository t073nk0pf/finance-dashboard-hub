import { deviationIcon, formatDeviation, getRubleEffect, isGoodDeviation } from "@/lib/calculations/variance";
import { formatMoney, formatPercent } from "@/lib/formatters";
import type { MainArticle } from "@/types/dashboard";

type MainArticlesTableProps = {
  articles: MainArticle[];
  factRevenue: number;
};

export function MainArticlesTable({ articles, factRevenue }: MainArticlesTableProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <div className="mb-4">
        <h2 className="text-xl font-black text-navy">Основные статьи</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
          Для расходов оценка идет по доле в выручке: снижение доли подсвечивается зеленым, рост доли - красным.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface2 text-xs uppercase tracking-[0.06em] text-primary">
              <th className="px-3 py-3 text-left">Статья</th>
              <th className="px-3 py-3 text-right">План</th>
              <th className="px-3 py-3 text-right">Факт</th>
              <th className="px-3 py-3 text-right">План, доля</th>
              <th className="px-3 py-3 text-right">Факт, доля</th>
              <th className="px-3 py-3 text-right">Отклонение</th>
              <th className="px-3 py-3 text-right">Руб.</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => {
              const good = isGoodDeviation(article);
              return (
                <tr key={article.key} className="border-b border-line transition hover:bg-blue-50/40 last:border-b-0">
                  <td className="min-w-72 px-3 py-3 text-left">
                    <div className="font-black text-slate-800">{article.title || article.label}</div>
                    <div className="mt-1 max-w-md text-xs font-bold leading-5 text-muted">{article.caption}</div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{formatMoney(article.plan)}</td>
                  <td className="px-3 py-3 text-right font-mono font-black">{formatMoney(article.fact)}</td>
                  <td className="px-3 py-3 text-right">{formatPercent(article.planShare)}</td>
                  <td className="px-3 py-3 text-right">{formatPercent(article.factShare)}</td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-black ${
                        good ? "border-emerald-100 bg-emerald-50 text-positive" : "border-red-100 bg-red-50 text-negative"
                      }`}
                    >
                      {deviationIcon(article)} {formatDeviation(article)}
                    </span>
                  </td>
                  <td className={`px-3 py-3 text-right font-bold ${good ? "text-positive" : "text-negative"}`}>
                    {formatMoney(getRubleEffect(article, factRevenue))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
