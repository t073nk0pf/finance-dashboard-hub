"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActiveFiltersSummary } from "@/components/dashboard/filters/ActiveFiltersSummary";
import { DashboardFilterBar } from "@/components/dashboard/filters/DashboardFilterBar";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DashboardForecastApiResponse } from "@/lib/dashboard/types";

function ForecastLoadingState() {
  return <div className="h-32 animate-pulse rounded-lg border border-line bg-surface shadow-soft" />;
}

function ForecastPageContent() {
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? "";
  const filtersEnabled = process.env.NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED === "true";
  const [data, setData] = useState<DashboardForecastApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadForecast() {
      setLoading(true);
      setError(null);
      try {
        const url = queryString ? `/api/forecast?${queryString}` : "/api/forecast";
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to load forecast data");
        }
        const payload = (await response.json()) as DashboardForecastApiResponse;
        if (active) setData(payload);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Failed to load forecast data");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadForecast();
    return () => {
      active = false;
    };
  }, [queryString]);

  const hasRows = Array.isArray(data?.rows) && data.rows.length > 0;

  return (
    <AppShell title="Forecast" description="Заготовка для правил прогноза, сценариев и ручных корректировок." period="январь-апрель 2026">
      {filtersEnabled ? (
        <>
          <DashboardFilterBar />
          <ActiveFiltersSummary />
        </>
      ) : null}

      {loading ? <ForecastLoadingState /> : null}
      {!loading && error ? <EmptyState title="Forecast data error" description={error} /> : null}
      {!loading && !error && !data ? <EmptyState title="Forecast module" description="Forecast API вернул пустой ответ." /> : null}
      {!loading && !error && data ? (
        <section className="space-y-3 rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-sm font-semibold text-ink">Forecast scenarios: {data.scenarios.length}</div>
          {hasRows ? <div className="text-sm text-muted">Rows: {data.rows?.length ?? 0}</div> : null}
          {data.generatedAt ? <div className="text-xs text-muted">Generated: {data.generatedAt}</div> : null}
          {!hasRows && data.next ? <div className="text-sm text-muted">{data.next}</div> : null}
        </section>
      ) : null}
    </AppShell>
  );
}

export default function ForecastPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Forecast" description="Загрузка..." period="загрузка">
          <ForecastLoadingState />
        </AppShell>
      }
    >
      <ForecastPageContent />
    </Suspense>
  );
}
