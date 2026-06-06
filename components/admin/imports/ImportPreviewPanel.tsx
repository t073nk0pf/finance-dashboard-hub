"use client";

import { useState, useTransition } from "react";
import type { ImportConfirmRowsResult, ImportPreviewRowsResult, ImportSourceType } from "@/lib/imports/types";

const sourceTypeOptions: ImportSourceType[] = ["manual", "seed", "google_sheets", "excel", "dodo_api", "csv"];

const sampleRows = [
  {
    date: "2026-05-01",
    unit: "Yerevan-1",
    metricKey: "revenue",
    valueType: "fact",
    value: 100000,
  },
  {
    date: "2026-05-01",
    unit: "Yerevan-1",
    metricKey: "ebitda",
    valueType: "fact",
    value: 15000,
  },
];

const sampleJson = JSON.stringify(sampleRows, null, 2);

type ApiErrorShape = {
  error?: string;
  message?: string;
  details?: Array<{ path?: string; message?: string }>;
};

type PreviewPayloadState = {
  sourceType: ImportSourceType;
  rows: Array<Record<string, unknown>>;
};

function isPreviewResult(value: unknown): value is ImportPreviewRowsResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.rowsPreview) && Array.isArray(candidate.errors) && typeof candidate.summary === "object" && typeof candidate.meta === "object";
}

function isConfirmResult(value: unknown): value is ImportConfirmRowsResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return "importBatch" in candidate && Array.isArray(candidate.savedFacts) && Array.isArray(candidate.errors) && typeof candidate.summary === "object" && typeof candidate.meta === "object";
}

function formatDate(value: string | null): string {
  if (!value) return " - ";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : value;
}

function unitLabel(row: ImportPreviewRowsResult["rowsPreview"][number]): string {
  return row.normalized.unitName ?? row.normalized.unitId ?? row.normalized.externalUnitId ?? " - ";
}

function buildApiErrorMessage(body: ApiErrorShape | null, fallback: string): string {
  if (!body) return fallback;
  if (body.message) return body.message;
  if (Array.isArray(body.details) && body.details.length > 0) {
    return body.details.map((item) => `${item.path ?? "request"}: ${item.message ?? "Invalid value"}`).join("\n");
  }
  if (body.error) return body.error;
  return fallback;
}

function generateIdempotencyKey(): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `import-ui-${Date.now()}-${suffix}`;
}

function parseRowsJson(rowsJson: string): { rows: Array<Record<string, unknown>>; error: string | null } {
  let parsedRows: unknown;
  try {
    parsedRows = JSON.parse(rowsJson);
  } catch {
    return { rows: [], error: "Rows JSON must be valid JSON." };
  }

  if (!Array.isArray(parsedRows)) {
    return { rows: [], error: "Rows JSON must be an array of objects." };
  }

  if (!parsedRows.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return { rows: [], error: "Each preview row must be a JSON object." };
  }

  return {
    rows: parsedRows as Array<Record<string, unknown>>,
    error: null,
  };
}

export function ImportPreviewPanel() {
  const [sourceType, setSourceType] = useState<ImportSourceType>("manual");
  const [rowsJson, setRowsJson] = useState(sampleJson);
  const [previewResult, setPreviewResult] = useState<ImportPreviewRowsResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<ImportConfirmRowsResult | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [previewPayload, setPreviewPayload] = useState<PreviewPayloadState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [previewLoading, startPreviewTransition] = useTransition();

  const reviewAvailable = Boolean(
    previewResult &&
      previewResult.summary.totalRows > 0 &&
      previewResult.summary.invalidRows === 0 &&
      previewResult.rowsPreview.every((row) => row.status !== "invalid"),
  );

  const handlePreview = () => {
    setPreviewError(null);
    setConfirmError(null);

    const parsed = parseRowsJson(rowsJson);
    if (parsed.error) {
      setPreviewResult(null);
      setConfirmResult(null);
      setPreviewPayload(null);
      setIdempotencyKey(null);
      setPreviewError(parsed.error);
      return;
    }

    startPreviewTransition(async () => {
      try {
        const response = await fetch("/api/admin/import-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sourceType,
            rows: parsed.rows,
          }),
        });

        const body = (await response.json().catch(() => null)) as ApiErrorShape | ImportPreviewRowsResult | null;
        if (!response.ok) {
          setPreviewResult(null);
          setConfirmResult(null);
          setPreviewPayload(null);
          setIdempotencyKey(null);
          setPreviewError(buildApiErrorMessage(body as ApiErrorShape | null, "Preview request failed."));
          return;
        }

        if (!isPreviewResult(body)) {
          setPreviewResult(null);
          setConfirmResult(null);
          setPreviewPayload(null);
          setIdempotencyKey(null);
          setPreviewError("Preview response has an unexpected shape.");
          return;
        }

        setPreviewResult(body);
        setConfirmResult(null);
        setConfirmError(null);
        setPreviewPayload({
          sourceType,
          rows: parsed.rows,
        });
        setIdempotencyKey(generateIdempotencyKey());
      } catch {
        setPreviewResult(null);
        setConfirmResult(null);
        setPreviewPayload(null);
        setIdempotencyKey(null);
        setPreviewError("Preview request failed.");
      }
    });
  };

  const handleConfirm = async () => {
    if (!reviewAvailable || !previewPayload || !idempotencyKey) return;

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const response = await fetch("/api/admin/import-confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sourceType: previewPayload.sourceType,
          rows: previewPayload.rows,
          idempotencyKey,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiErrorShape | ImportConfirmRowsResult | null;
      if (isConfirmResult(body)) {
        setConfirmResult(body);
        setConfirmError(null);
        return;
      }

      setConfirmResult(null);
      setConfirmError(buildApiErrorMessage(body as ApiErrorShape | null, "Confirm request failed."));
    } catch {
      setConfirmResult(null);
      setConfirmError("Confirm request failed.");
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-4">
          <h2 className="text-xl font-black text-navy">Import preview</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Read-only preview for sample rows. This panel validates import data and shows normalized rows without creating ImportBatch or AnalyticsFact records.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <label className="text-xs text-muted">
            <div className="mb-1 uppercase tracking-[0.06em]">Source type</div>
            <select
              value={sourceType}
              onChange={(event) => {
                setSourceType(event.target.value as ImportSourceType);
                setPreviewResult(null);
                setConfirmResult(null);
                setPreviewPayload(null);
                setIdempotencyKey(null);
                setPreviewError(null);
                setConfirmError(null);
              }}
              className="w-full rounded border border-line bg-surface2 px-2 py-2 text-sm text-ink"
            >
              {sourceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded border border-line bg-surface2 px-3 py-2 text-xs leading-6 text-muted">
            <div className="font-black uppercase tracking-[0.06em] text-ink">Sample JSON</div>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-muted">{sampleJson}</pre>
          </div>
        </div>

        <label className="mt-4 block text-xs text-muted">
          <div className="mb-1 uppercase tracking-[0.06em]">Rows JSON</div>
          <textarea
            value={rowsJson}
            onChange={(event) => {
              setRowsJson(event.target.value);
              setPreviewResult(null);
              setConfirmResult(null);
              setPreviewPayload(null);
              setIdempotencyKey(null);
              setPreviewError(null);
              setConfirmError(null);
            }}
            rows={12}
            spellCheck={false}
            placeholder={sampleJson}
            onFocus={() => {
              setPreviewError(null);
              setConfirmError(null);
            }}
            className="w-full rounded border border-line bg-surface2 px-3 py-3 font-mono text-sm leading-6 text-ink"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="rounded border border-line bg-surface2 px-3 py-2 text-xs font-black uppercase tracking-[0.06em] text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {previewLoading ? "Previewing..." : "Preview"}
          </button>
          <span className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">Preview only</span>
          {idempotencyKey ? (
            <span className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">idempotencyKey ready</span>
          ) : null}
        </div>

        {previewError ? (
          <div className="mt-4 rounded border border-negative/30 bg-negative/10 px-3 py-3 text-sm whitespace-pre-wrap text-negative">
            {previewError}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.08em] text-muted">Preview result</h3>
          <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-muted">
            persisted={String(previewResult?.meta.persisted ?? false)}
          </span>
          <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-muted">Preview only</span>
        </div>

        {!previewResult ? (
          <div className="rounded border border-dashed border-line bg-surface2 p-4 text-sm text-muted">
            Submit sample rows to see validation summary, normalized rows and row-level errors.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Total rows</div>
                <div className="mt-2 text-2xl font-black text-navy">{previewResult.summary.totalRows}</div>
              </article>
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Valid rows</div>
                <div className="mt-2 text-2xl font-black text-positive">{previewResult.summary.validRows}</div>
              </article>
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Warning rows</div>
                <div className="mt-2 text-2xl font-black text-warning">{previewResult.summary.warningRows}</div>
              </article>
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Invalid rows</div>
                <div className="mt-2 text-2xl font-black text-negative">{previewResult.summary.invalidRows}</div>
              </article>
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Errors count</div>
                <div className="mt-2 text-2xl font-black text-navy">{previewResult.summary.errorsCount}</div>
              </article>
            </div>

            <div className="rounded border border-line bg-surface2 px-3 py-3 text-xs text-muted">
              <div>Preview only</div>
              <div>persisted=false</div>
            </div>

            {reviewAvailable ? (
              <div className="rounded-lg border border-line bg-surface p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="text-sm font-black uppercase tracking-[0.08em] text-muted">Review</div>
                  <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-muted">
                    sourceType={previewPayload?.sourceType ?? sourceType}
                  </span>
                  <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-muted">
                    persisted={String(previewResult.meta.persisted)}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border border-line bg-surface2 px-3 py-3 text-xs leading-6 text-muted">
                    <div>Total rows: {previewResult.summary.totalRows}</div>
                    <div>Valid rows: {previewResult.summary.validRows}</div>
                    <div>Warning rows: {previewResult.summary.warningRows}</div>
                    <div>Errors count: {previewResult.summary.errorsCount}</div>
                  </div>
                  <div className="rounded border border-line bg-surface2 px-3 py-3 text-xs leading-6 text-muted">
                    <div>Confirm will write valid rows to ImportBatch and AnalyticsFact.</div>
                    <div>No partial import in v1.</div>
                    <div>idempotencyKey: {idempotencyKey ?? "pending"}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirmLoading || !previewPayload || !idempotencyKey || previewResult.summary.invalidRows > 0 || previewResult.summary.totalRows === 0}
                    className="rounded border border-line bg-surface2 px-3 py-2 text-xs font-black uppercase tracking-[0.06em] text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirmLoading ? "Confirming..." : "Confirm Import"}
                  </button>
                  {previewResult.summary.warningRows > 0 ? (
                    <span className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-warning">
                      warnings={previewResult.summary.warningRows}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : previewResult.summary.invalidRows > 0 ? (
              <div className="rounded border border-warning/30 bg-warning/10 px-3 py-3 text-sm text-warning">
                Import cannot be confirmed while invalid rows exist.
              </div>
            ) : null}

            <div className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Rows preview</div>
              {!previewResult.rowsPreview.length ? (
                <div className="rounded border border-dashed border-line bg-surface2 p-4 text-sm text-muted">No rows in preview.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                        <th className="px-2 py-2">Row</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Date</th>
                        <th className="px-2 py-2">Unit</th>
                        <th className="px-2 py-2">Metric</th>
                        <th className="px-2 py-2">Value type</th>
                        <th className="px-2 py-2">Value</th>
                        <th className="px-2 py-2">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewResult.rowsPreview.map((row) => (
                        <tr key={row.rowIndex} className="border-t border-line">
                          <td className="px-2 py-2 text-muted">{row.rowIndex}</td>
                          <td className="px-2 py-2 text-muted">{row.status}</td>
                          <td className="px-2 py-2 text-muted">{formatDate(row.normalized.date)}</td>
                          <td className="px-2 py-2 text-muted">{unitLabel(row)}</td>
                          <td className="px-2 py-2 text-muted">{row.normalized.metricKey ?? " - "}</td>
                          <td className="px-2 py-2 text-muted">{row.normalized.valueType ?? " - "}</td>
                          <td className="px-2 py-2 text-muted">{row.normalized.value ?? " - "}</td>
                          <td className="px-2 py-2 text-muted">{row.errors.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Row-level errors</div>
              {!previewResult.errors.length ? (
                <div className="rounded border border-dashed border-line bg-surface2 p-4 text-sm text-muted">No validation errors.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                        <th className="px-2 py-2">Row</th>
                        <th className="px-2 py-2">Field</th>
                        <th className="px-2 py-2">Message</th>
                        <th className="px-2 py-2">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewResult.errors.map((issue, index) => (
                        <tr key={`${issue.rowIndex}-${issue.field ?? "general"}-${index}`} className="border-t border-line">
                          <td className="px-2 py-2 text-muted">{issue.rowIndex}</td>
                          <td className="px-2 py-2 text-muted">{issue.field ?? "row"}</td>
                          <td className="px-2 py-2 text-muted">{issue.message}</td>
                          <td className="px-2 py-2 text-muted">{issue.severity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {confirmError ? (
              <div className="rounded border border-negative/30 bg-negative/10 px-3 py-3 text-sm whitespace-pre-wrap text-negative">
                {confirmError}
              </div>
            ) : null}

            {confirmResult ? (
              <div className="rounded-lg border border-line bg-surface p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="text-sm font-black uppercase tracking-[0.08em] text-muted">Confirm result</div>
                  <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-muted">
                    persisted={String(confirmResult.meta.persisted)}
                  </span>
                  <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-muted">
                    rejected={String(confirmResult.meta.rejected)}
                  </span>
                  {confirmResult.meta.duplicate ? (
                    <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-warning">
                      duplicate=true
                    </span>
                  ) : null}
                </div>
                {confirmResult.meta.duplicate ? (
                  <div className="mb-3 rounded border border-warning/30 bg-warning/10 px-3 py-3 text-sm text-warning">
                    Duplicate request detected; existing batch returned.
                  </div>
                ) : null}
                {confirmResult.meta.rejected ? (
                  <div className="mb-3 rounded border border-warning/30 bg-warning/10 px-3 py-3 text-sm text-warning">
                    Import request was rejected by server-side validation.
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded border border-line bg-surface2 px-3 py-3 text-xs leading-6 text-muted">
                    <div>Import batch id: {confirmResult.importBatch?.id ?? "none"}</div>
                    <div>Import batch status: {confirmResult.importBatch?.status ?? "none"}</div>
                    <div>Saved facts: {confirmResult.savedFacts.length}</div>
                  </div>
                  <div className="rounded border border-line bg-surface2 px-3 py-3 text-xs leading-6 text-muted">
                    <div>Total rows: {confirmResult.summary.totalRows}</div>
                    <div>Valid rows: {confirmResult.summary.validRows}</div>
                    <div>Warning rows: {confirmResult.summary.warningRows}</div>
                    <div>Errors count: {confirmResult.summary.errorsCount}</div>
                  </div>
                </div>
                {confirmResult.errors.length > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                          <th className="px-2 py-2">Row</th>
                          <th className="px-2 py-2">Field</th>
                          <th className="px-2 py-2">Message</th>
                          <th className="px-2 py-2">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {confirmResult.errors.map((issue, index) => (
                          <tr key={`confirm-${issue.rowIndex}-${issue.field ?? "general"}-${index}`} className="border-t border-line">
                            <td className="px-2 py-2 text-muted">{issue.rowIndex}</td>
                            <td className="px-2 py-2 text-muted">{issue.field ?? "row"}</td>
                            <td className="px-2 py-2 text-muted">{issue.message}</td>
                            <td className="px-2 py-2 text-muted">{issue.severity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
