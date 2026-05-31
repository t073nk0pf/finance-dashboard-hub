import { Suspense } from "react";
import { ArmeniaPageClient } from "@/components/armenia/ArmeniaPageClient";
import { ArmeniaOverviewDashboard } from "@/components/armenia/ArmeniaOverviewDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";

export default async function ArmeniaPage() {
  const filtersEnabled = process.env.NEXT_PUBLIC_DASHBOARD_FILTERS_ENABLED === "true";
  if (filtersEnabled) {
    return (
      <Suspense
        fallback={
          <AppShell
            title="Armenia: financial control"
            description="Отдельный контур по Армении: выручка, EBITDA, чистая прибыль, Food Cost, Opex, количество пиццерий и статус готовности к развитию."
            period="загрузка"
            legalEntities="Armenia"
            accent="armenia"
          >
            <div className="h-32 animate-pulse rounded-lg border border-line bg-surface shadow-soft" />
          </AppShell>
        }
      >
        <ArmeniaPageClient />
      </Suspense>
    );
  }

  const data = await getArmeniaDashboardData();

  return (
    <AppShell
      title="Armenia: financial control"
      description="Отдельный контур по Армении: выручка, EBITDA, чистая прибыль, Food Cost, Opex, количество пиццерий и статус готовности к развитию."
      period={data.period.label}
      legalEntities="Armenia"
      accent="armenia"
    >
      <ArmeniaOverviewDashboard data={data} />
    </AppShell>
  );
}
