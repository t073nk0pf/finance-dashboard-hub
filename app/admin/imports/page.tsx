import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminImportsPage() {
  return (
    <AppShell title="Admin: imports" description="Контроль загрузок, ImportBatch и статусов обработки." period="system">
      <EmptyState title="Импорты" description="Здесь будет загрузка XLSX/CSV, журнал ImportBatch и диагностика ошибок парсинга." />
    </AppShell>
  );
}
