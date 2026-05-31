import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import {
  getAdminDataSourcesSummary,
  getAdminImportBatchesSummary,
  listAdminDataSources,
  listAdminImportBatches,
} from "@/lib/admin/dataSourcesService";

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16).replace("T", " ") : "Invalid date";
}

export default async function AdminDataSourcesPage() {
  const [sources, batches] = await Promise.all([listAdminDataSources(), listAdminImportBatches({ limit: 20 })]);
  const sourceSummary = getAdminDataSourcesSummary(sources);
  const batchSummary = getAdminImportBatchesSummary(batches);

  return (
    <AppShell title="Admin: data sources" description="Read-only обзор источников данных, батчей импорта и последних ошибок." period="system">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Total sources</div>
          <div className="mt-3 text-2xl font-black text-navy">{sourceSummary.total}</div>
        </article>
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Active</div>
          <div className="mt-3 text-2xl font-black text-positive">{sourceSummary.active}</div>
        </article>
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Failed</div>
          <div className="mt-3 text-2xl font-black text-negative">{sourceSummary.failed}</div>
        </article>
        <article className="rounded-lg border border-line bg-surface p-4 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.08em] text-muted">Never synced</div>
          <div className="mt-3 text-2xl font-black text-warning">{sourceSummary.neverSynced}</div>
        </article>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Data sources</div>
        {!sources.length ? (
          <div className="rounded border border-dashed border-line bg-surface2 p-4 text-sm text-muted">No data sources yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Last sync</th>
                  <th className="px-2 py-2">Rows imported</th>
                  <th className="px-2 py-2">Rows failed</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-t border-line">
                    <td className="px-2 py-2 text-ink">
                      <Link href={`/admin/data-sources/${source.id}`} className="underline-offset-2 hover:underline">
                        {source.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-muted">{source.type}</td>
                    <td className="px-2 py-2 text-muted">{source.status}</td>
                    <td className="px-2 py-2 text-muted">{formatDate(source.lastSyncAt)}</td>
                    <td className="px-2 py-2 text-muted">{source.rowsImported}</td>
                    <td className="px-2 py-2 text-muted">{source.rowsFailed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Recent import batches</div>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">total: {batchSummary.total}</div>
          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">completed: {batchSummary.completed}</div>
          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">failed: {batchSummary.failed}</div>
          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">running/draft: {batchSummary.running}/{batchSummary.draft}</div>
        </div>
        {!batches.length ? (
          <div className="rounded border border-dashed border-line bg-surface2 p-4 text-sm text-muted">No import batches yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-2 py-2">Source type</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Imported / failed</th>
                  <th className="px-2 py-2">Started</th>
                  <th className="px-2 py-2">Finished</th>
                  <th className="px-2 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-line">
                    <td className="px-2 py-2 text-muted">{batch.sourceType}</td>
                    <td className="px-2 py-2 text-muted">{batch.status}</td>
                    <td className="px-2 py-2 text-muted">
                      {batch.rowsImported} / {batch.rowsFailed}
                    </td>
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

      <section className="mt-5 rounded-lg border border-line bg-surface p-4 text-xs text-muted shadow-soft">
        <div>Sync - coming later</div>
        <div>Upload - coming later</div>
      </section>
    </AppShell>
  );
}
