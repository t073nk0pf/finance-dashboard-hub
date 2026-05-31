import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getAdminDataSourceDetails } from "@/lib/admin/dataSourcesService";

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16).replace("T", " ") : "Invalid date";
}

export default async function AdminDataSourceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = await getAdminDataSourceDetails(id);

  if (!details) notFound();

  return (
    <AppShell title="Admin: data source details" description="Read-only детали источника данных и последних импортов." period="system">
      <section className="mb-4 rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-2 text-sm text-muted">
          <Link href="/admin/data-sources" className="underline-offset-2 hover:underline">
            Back to Data Sources
          </Link>
        </div>
        <h2 className="text-xl font-black text-navy">{details.source.name}</h2>
        <div className="mt-2 text-sm text-muted">
          type: {details.source.type} · status: {details.source.status}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Total batches</div>
          <div className="mt-2 text-2xl font-black text-navy">{details.summary.batchesTotal}</div>
        </article>
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Completed</div>
          <div className="mt-2 text-2xl font-black text-positive">{details.summary.completed}</div>
        </article>
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Failed</div>
          <div className="mt-2 text-2xl font-black text-negative">{details.summary.failed}</div>
        </article>
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Rows imported</div>
          <div className="mt-2 text-2xl font-black text-navy">{details.summary.rowsImported}</div>
        </article>
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Rows failed</div>
          <div className="mt-2 text-2xl font-black text-warning">{details.summary.rowsFailed}</div>
        </article>
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Last import</div>
          <div className="mt-2 text-sm font-black text-muted">{formatDate(details.summary.lastImportAt)}</div>
        </article>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Source metadata</div>
        <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          <div>id: {details.source.id}</div>
          <div>type: {details.source.type}</div>
          <div>status: {details.source.status}</div>
          <div>last sync: {formatDate(details.source.lastSyncAt)}</div>
          <div>created: {formatDate(details.source.createdAt)}</div>
          <div>updated: {formatDate(details.source.updatedAt)}</div>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Recent batches</div>
        {!details.recentBatches.length ? (
          <div className="rounded border border-dashed border-line bg-surface2 p-4 text-sm text-muted">No batches for this source yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Source type</th>
                  <th className="px-2 py-2">Imported / failed</th>
                  <th className="px-2 py-2">Started</th>
                  <th className="px-2 py-2">Finished</th>
                  <th className="px-2 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {details.recentBatches.map((batch) => (
                  <tr key={batch.id} className="border-t border-line">
                    <td className="px-2 py-2 text-muted">{batch.status}</td>
                    <td className="px-2 py-2 text-muted">{batch.sourceType}</td>
                    <td className="px-2 py-2 text-muted">{batch.rowsImported} / {batch.rowsFailed}</td>
                    <td className="px-2 py-2 text-muted">{formatDate(batch.startedAt)}</td>
                    <td className="px-2 py-2 text-muted">{formatDate(batch.finishedAt)}</td>
                    <td className="px-2 py-2 text-muted">{batch.errorSummary ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Recent errors</div>
        {!details.recentErrors.length ? (
          <div className="rounded border border-dashed border-line bg-surface2 p-4 text-sm text-muted">No import errors for this source.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-2 py-2">Batch</th>
                  <th className="px-2 py-2">Row</th>
                  <th className="px-2 py-2">Field</th>
                  <th className="px-2 py-2">Message</th>
                  <th className="px-2 py-2">Severity</th>
                  <th className="px-2 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {details.recentErrors.map((error) => (
                  <tr key={error.id} className="border-t border-line">
                    <td className="px-2 py-2 text-muted">{error.importBatchId}</td>
                    <td className="px-2 py-2 text-muted">{error.rowNumber}</td>
                    <td className="px-2 py-2 text-muted">{error.field ?? "—"}</td>
                    <td className="px-2 py-2 text-muted">{error.message}</td>
                    <td className="px-2 py-2 text-muted">{error.severity}</td>
                    <td className="px-2 py-2 text-muted">{formatDate(error.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-line bg-surface p-4 text-xs text-muted shadow-soft">
        <div>Sync - coming later</div>
        <div>Configure - coming later</div>
      </section>
    </AppShell>
  );
}
