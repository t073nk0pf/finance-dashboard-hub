import { ArmeniaGrowthDashboard } from "@/components/armenia/ArmeniaGrowthDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";

export default async function ArmeniaGrowthPage() {
  const data = await getArmeniaDashboardData();

  return (
    <AppShell title="Armenia: growth readiness" description="Правила развития по EBITDA %: 15% как порог, 17-18% как ускоренный сценарий." period={data.period.label} legalEntities="Armenia" accent="armenia">
      <ArmeniaGrowthDashboard data={data} />
    </AppShell>
  );
}
