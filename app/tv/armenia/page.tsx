import { OfficeTvLayout } from "@/components/tv/OfficeTvLayout";
import { getArmeniaDashboardData } from "@/lib/data/armeniaDataService";

export default async function ArmeniaTvPage() {
  const data = await getArmeniaDashboardData();

  return <OfficeTvLayout data={data} />;
}
