import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import {
  getAdminDataSourcesSummary,
  getAdminImportBatchesSummary,
  listAdminDataSources,
  listAdminImportBatches,
  normalizeAdminDataSourceFilters,
} from "@/lib/admin/dataSourcesService";

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16).replace("T", " ") : "Invalid date";
}

function toSearchParams(entries: Record<string, string | undefined | null>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    if (value) params.set(key, value);
  }
  return params;
}

function paginationHref(basePath: string, current: URLSearchParams, nextOffset: number): string {
  const next = new URLSearchParams(current);
  if (nextOffset <= 0) next.delete("offset");
  else next.set("offset", String(nextOffset));
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default async function AdminDataSourcesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = (await searchParams) ?? {};
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") search.set(key, value);
  }

  const normalized = normalizeAdminDataSourceFilters(search);
  const [sourcesResult, sourceSummary, batchesResult, batchSummary] = await Promise.all([
    listAdminDataSources({
      type: normalized.type,
      status: normalized.status,
      search: normalized.search,
      limit: normalized.limit,
      offset: normalized.offset,
    }),
    getAdminDataSourcesSummary({
      type: normalized.type,
      status: normalized.status,
      search: normalized.search,
    }),
    listAdminImportBatches({
      limit: 20,
      offset: 0,
    }),
    getAdminImportBatchesSummary({}),
  ]);

  const filterQuery = toSearchParams({
    type: normalized.type,
    status: normalized.status,
    search: normalized.search,
    limit: String(normalized.limit),
  });
  const prevOffset = Math.max(0, normalized.offset - normalized.limit);
  const nextOffset = normalized.offset + normalized.limit;

  return (
    <AppShell title="Admin: data sources" description="Read-only обзор источников данных, батчей импорта и последних ошибок." period="system">
      <section className="rounded-lg border border-line bg-surface p-4 shadow-soft">
        <form method="GET" className="grid gap-3 md:grid-cols-5">
          <label className="text-xs text-muted">
            <div className="mb-1 uppercase tracking-[0.06em]">Status</div>
            <select name="status" defaultValue={normalized.status ?? ""} className="w-full rounded border border-line bg-surface2 px-2 py-2 text-sm text-ink">
              <option value="">all</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="error">error</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            <div className="mb-1 uppercase tracking-[0.06em]">Type</div>
            <select name="type" defaultValue={normalized.type ?? ""} className="w-full rounded border border-line bg-surface2 px-2 py-2 text-sm text-ink">
              <option value="">all</option>
              <option value="manual">manual</option>
              <option value="excel">excel</option>
              <option value="csv">csv</option>
              <option value="google_sheets">google_sheets</option>
              <option value="dodo_api">dodo_api</option>
              <option value="seed">seed</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            <div className="mb-1 uppercase tracking-[0.06em]">Search</div>
            <input name="search" defaultValue={normalized.search ?? ""} placeholder="name/id/type" className="w-full rounded border border-line bg-surface2 px-2 py-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-muted">
            <div className="mb-1 uppercase tracking-[0.06em]">Limit</div>
            <select name="limit" defaultValue={String(normalized.limit)} className="w-full rounded border border-line bg-surface2 px-2 py-2 text-sm text-ink">
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-ink">Apply</button>
            <Link href="/admin/data-sources" className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">Reset</Link>
          </div>
        </form>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        {!sourcesResult.items.length ? (
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
                {sourcesResult.items.map((source) => (
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
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>
            Showing {sourcesResult.pagination.total === 0 ? 0 : normalized.offset + 1}-
            {Math.min(normalized.offset + normalized.limit, sourcesResult.pagination.total)} of {sourcesResult.pagination.total}
          </span>
          <div className="flex gap-2">
            <Link
              href={paginationHref("/admin/data-sources", filterQuery, prevOffset)}
              className={`rounded border border-line px-3 py-1 ${normalized.offset <= 0 ? "pointer-events-none opacity-50" : ""}`}
            >
              Previous
            </Link>
            <Link
              href={paginationHref("/admin/data-sources", filterQuery, nextOffset)}
              className={`rounded border border-line px-3 py-1 ${sourcesResult.pagination.hasMore ? "" : "pointer-events-none opacity-50"}`}
            >
              Next
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Recent import batches</div>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">total: {batchSummary.total}</div>
          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">completed: {batchSummary.completed}</div>
          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">failed: {batchSummary.failed}</div>
          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">running/draft: {batchSummary.running}/{batchSummary.draft}</div>
        </div>
        {!batchesResult.items.length ? (
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
                {batchesResult.items.map((batch) => (
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
