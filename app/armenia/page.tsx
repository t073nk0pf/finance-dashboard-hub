import { ArmeniaOverviewDashboard } from "@/components/armenia/ArmeniaOverviewDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";

export default async function ArmeniaPage() {
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
