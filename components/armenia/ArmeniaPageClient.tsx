"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArmeniaAdvancedFilterControls } from "@/components/armenia/ArmeniaAdvancedFilterControls";
import { ArmeniaOverviewDashboard } from "@/components/armenia/ArmeniaOverviewDashboard";
import { ActiveFiltersSummary } from "@/components/dashboard/filters/ActiveFiltersSummary";
import { DashboardFilterBar } from "@/components/dashboard/filters/DashboardFilterBar";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ArmeniaDashboardData } from "@/types/armenia";

function ArmeniaLoadingState() {
  return <div className="h-32 animate-pulse rounded-lg border border-line bg-surface shadow-soft" />;
}

export function ArmeniaPageClient() {
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? "";
  const advancedFiltersEnabled = process.env.NEXT_PUBLIC_ARMENIA_ADVANCED_FILTERS_ENABLED === "true";
  const [data, setData] = useState<ArmeniaDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadArmenia() {
      setLoading(true);
      setError(null);

      try {
        const url = queryString ? `/api/dashboards/armenia?${queryString}` : "/api/dashboards/armenia";
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to load Armenia dashboard data");
        }
        const payload = (await response.json()) as ArmeniaDashboardData;
        if (active) setData(payload);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Failed to load Armenia dashboard data");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadArmenia();
    return () => {
      active = false;
    };
  }, [queryString]);

  return (
    <AppShell
      title="Armenia: financial control"
      description="Отдельный контур по Армении: выручка, EBITDA, чистая прибыль, Food Cost, Opex, количество пиццерий и статус готовности к развитию."
      period={data?.period.label ?? "загрузка"}
      legalEntities="Armenia"
      accent="armenia"
    >
      <DashboardFilterBar />
      {advancedFiltersEnabled ? <ArmeniaAdvancedFilterControls /> : null}
      <ActiveFiltersSummary />

      {loading ? <ArmeniaLoadingState /> : null}
      {!loading && error ? <EmptyState title="Armenia data error" description={error} /> : null}
      {!loading && !error && data ? <ArmeniaOverviewDashboard data={data} /> : null}
      {!loading && !error && !data ? (
        <EmptyState title="Armenia dashboard" description="API /api/dashboards/armenia вернул пустой ответ." />
      ) : null}
    </AppShell>
  );
}
