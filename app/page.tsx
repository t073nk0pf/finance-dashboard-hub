import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

const productCards = [
  {
    title: "План-факт",
    body: "KPI, графики, основные статьи, отклонения и юрлица на базе текущего бизнес-прототипа.",
    href: "/dashboards/plan-fact",
  },
  {
    title: "Armenia Growth",
    body: "Отдельный контур для прибыльности, роста, ресторанов и готовности к развитию.",
    href: "/armenia",
  },
  {
    title: "Office TV",
    body: "Безопасный полноэкранный режим для офиса: крупные KPI и минимум чувствительной детализации.",
    href: "/tv/armenia",
  },
];

export default function HomePage() {
  return (
    <AppShell
      title="Finance Dashboard Hub"
      description="Внутренний финансовый сервис для управленческих отчетов, план-факт анализа, роста новых рынков и офисных TV-панелей."
      period="январь-апрель 2026"
      legalEntities="multi-entity"
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {productCards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-lg border border-line bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel">
            <div className="text-xs font-black uppercase tracking-[0.08em] text-primary">Module</div>
            <h2 className="mt-3 text-2xl font-black text-navy">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{card.body}</p>
          </Link>
        ))}
      </section>
      <section className="rounded-lg border border-line bg-surface p-6 shadow-soft">
        <h2 className="text-xl font-black text-navy">MVP scope</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">
          Проект подготовлен как production-ready MVP: App Router, TypeScript, Tailwind, Prisma/PostgreSQL,
          минимальная авторизация, JSON fallback для план-факт дашборда и отдельные заготовки для импорта, forecast и админки.
        </p>
      </section>
    </AppShell>
  );
}
