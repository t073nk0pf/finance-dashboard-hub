import { AppShell } from "@/components/layout/AppShell";
import { ImportPreviewPanel } from "@/components/admin/imports/ImportPreviewPanel";

export default function AdminImportsPage() {
  return (
    <AppShell title="Admin: imports" description="Read-only import preview for sample rows, validation output and future batch diagnostics." period="system">
      <ImportPreviewPanel />
    </AppShell>
  );
}
