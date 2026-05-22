import { EmptyState } from "@/components/ui/EmptyState";
import { AppShell } from "@/components/layout/AppShell";

export default function ForecastPage() {
  return (
    <AppShell title="Forecast" description="Заготовка для правил прогноза, сценариев и ручных корректировок." period="январь-апрель 2026">
      <EmptyState title="Forecast module" description="Здесь появятся сценарии, правила forecast и сравнение план / прогноз / факт после подключения импорта." />
    </AppShell>
  );
}
