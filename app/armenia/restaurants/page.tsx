import { ArmeniaRestaurantsTable } from "@/components/armenia/ArmeniaRestaurantsTable";
import { AppShell } from "@/components/layout/AppShell";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";

export default async function ArmeniaRestaurantsPage() {
  const data = await getArmeniaDashboardData();

  return (
    <AppShell title="Armenia: restaurants" description="Демо-таблица ресторанов для будущей загрузки факта и unit economics." period={data.period.label} legalEntities="Armenia" accent="armenia">
      <ArmeniaRestaurantsTable data={data} />
    </AppShell>
  );
}
