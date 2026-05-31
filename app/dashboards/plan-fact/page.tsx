"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EntityCards } from "@/components/dashboard/EntityCards";
import { EntityTable } from "@/components/dashboard/EntityTable";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { DashboardFilterBar } from "@/components/dashboard/filters/DashboardFilterBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { LineChartCard } from "@/components/dashboard/LineChartCard";
import { MainArticlesTable } from "@/components/dashboard/MainArticlesTable";
import { RiskPanel } from "@/components/dashboard/RiskPanel";
import { VarianceList } from "@/components/dashboard/VarianceList";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DashboardData } from "@/types/dashboard";

function PlanFactLoadingState() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-lg border border-line bg-surface shadow-soft" />
      ))}
    </section>
  );
}

function PlanFactPageContent() {
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? "";
  const filtersEnabled = process.env.NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED === "true";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const url = queryString ? `/api/dashboards/plan-fact?${queryString}` : "/api/dashboards/plan-fact";
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to load dashboard data");
        }

        const payload = (await response.json()) as DashboardData;
        if (active) setData(payload);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [queryString]);

  const metrics = data?.metrics;

  return (
    <AppShell
      title="План-факт 2026"
      description="Управленческий дашборд по листу Сводно: динамика к плану, основные статьи, лучшие и худшие отклонения и срез по юрлицам."
      period={data?.source.period ?? "загрузка"}
      legalEntities={data?.source.legalEntities.length ?? "загрузка"}
    >
      {loading ? <PlanFactLoadingState /> : null}

      {!loading && error ? <EmptyState title="Данные не загружены" description={error} /> : null}

      {!loading && !error && !data ? (
        <EmptyState title="Нет данных" description="API вернул пустой ответ. Проверь источник данных dashboardDataService." />
      ) : null}

      {!loading && !error && data && metrics ? (
        <>
          {filtersEnabled ? <DashboardFilterBar /> : null}

          <ExecutiveSummary data={data} />

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard title="Выручка" metric={metrics.revenue} />
            <KpiCard title="Опер. расходы" metric={metrics.opex} mode="share" />
            <KpiCard title="EBITDA" metric={metrics.ebitda} />
            <KpiCard title="Чистая прибыль" metric={metrics.netProfit} />
            <KpiCard title="Расчетный FC" metric={metrics.foodCost} mode="share" />
            <KpiCard title="Прочие опер." metric={metrics.otherOpex} mode="share" />
          </section>

          <RiskPanel items={data.expenseVariance.worse} />

          <section className="grid gap-5 xl:grid-cols-2">
            <LineChartCard title="Динамика выручки" description="План и факт по месяцам, млн ₽." metric={metrics.revenue} color="#0B5CAD" />
            <LineChartCard
              title="Операционные расходы"
              description="Доля расходов в выручке."
              metric={metrics.opex}
              revenueMetric={metrics.revenue}
              mode="share"
              color="#168A5B"
            />
            <LineChartCard title="EBITDA" description="Помесячная прибыльность до амортизации, налогов и финансовых статей." metric={metrics.ebitda} color="#38BDF8" />
            <LineChartCard title="Чистая прибыль" description="План и факт по строке чистой прибыли." metric={metrics.netProfit} color="#9F1239" />
          </section>

          <MainArticlesTable articles={data.mainArticles} factRevenue={metrics.revenue.fact} />
          <VarianceList title="Статьи: лучше и хуже плана" better={data.expenseVariance.better} worse={data.expenseVariance.worse} />
          <EntityTable entities={data.entities} />
          <EntityCards entities={data.entities} />
        </>
      ) : null}
    </AppShell>
  );
}

export default function PlanFactPage() {
  return (
    <Suspense fallback={<AppShell title="План-факт 2026" description="Загрузка..." period="загрузка" legalEntities="загрузка"><PlanFactLoadingState /></AppShell>}>
      <PlanFactPageContent />
    </Suspense>
  );
}
