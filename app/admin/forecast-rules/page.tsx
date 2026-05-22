import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminForecastRulesPage() {
  return (
    <AppShell title="Admin: forecast rules" description="Правила forecast, сценарии роста и ручные корректировки." period="system">
      <EmptyState title="Forecast rules" description="Здесь будут правила прогнозирования, NetworkGrowthScenario и ManualAdjustment." />
    </AppShell>
  );
}
