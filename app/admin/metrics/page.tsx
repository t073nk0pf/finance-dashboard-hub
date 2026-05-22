import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminMetricsPage() {
  return (
    <AppShell title="Admin: metrics" description="Справочник статей и управленческих метрик." period="system">
      <EmptyState title="Метрики" description="Будущий справочник MetricArticle: тип статьи, parent hierarchy, expense/profit логика и порядок отображения." />
    </AppShell>
  );
}
