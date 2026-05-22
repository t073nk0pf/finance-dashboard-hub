import { ArmeniaProfitabilityDashboard } from "@/components/armenia/ArmeniaProfitabilityDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";

export default async function ArmeniaProfitabilityPage() {
  const data = await getArmeniaDashboardData();

  return (
    <AppShell title="Armenia: profitability" description="Динамика EBITDA, EBITDA %, чистой прибыли и выручки." period={data.period.label} legalEntities="Armenia" accent="armenia">
      <ArmeniaProfitabilityDashboard data={data} />
    </AppShell>
  );
}
