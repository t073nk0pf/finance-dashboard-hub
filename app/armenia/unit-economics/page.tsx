import { ArmeniaUnitEconomicsDashboard } from "@/components/armenia/ArmeniaUnitEconomicsDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";

export default async function ArmeniaUnitEconomicsPage() {
  const data = await getArmeniaDashboardData();

  return (
    <AppShell title="Armenia: unit economics" description="Структура для экономики по ресторанам: выручка, EBITDA %, Food Cost и будущие драйверы." period={data.period.label} legalEntities="Armenia" accent="armenia">
      <ArmeniaUnitEconomicsDashboard data={data} />
    </AppShell>
  );
}
