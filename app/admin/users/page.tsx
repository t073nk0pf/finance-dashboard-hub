import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminUsersPage() {
  return (
    <AppShell title="Admin: users" description="Управление пользователями и доступами." period="system">
      <EmptyState title="Пользователи" description="Следующий шаг: CRUD пользователей, роли, UserAccess и аудит изменений." />
    </AppShell>
  );
}
