"use client";

import { useState, useTransition } from "react";
import type { ImportPreviewRowsResult, ImportSourceType } from "@/lib/imports/types";

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

function isPreviewResult(value: unknown): value is ImportPreviewRowsResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.rowsPreview) && Array.isArray(candidate.errors) && typeof candidate.summary === "object" && typeof candidate.meta === "object";
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

export function ImportPreviewPanel() {
  const [sourceType, setSourceType] = useState<ImportSourceType>("manual");
  const [rowsJson, setRowsJson] = useState(sampleJson);
  const [result, setResult] = useState<ImportPreviewRowsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePreview = () => {
    setError(null);

    let parsedRows: unknown;
    try {
      parsedRows = JSON.parse(rowsJson);
    } catch {
      setResult(null);
      setError("Rows JSON must be valid JSON.");
      return;
    }

    if (!Array.isArray(parsedRows)) {
      setResult(null);
      setError("Rows JSON must be an array of objects.");
      return;
    }

    if (!parsedRows.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
      setResult(null);
      setError("Each preview row must be a JSON object.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/import-preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sourceType,
            rows: parsedRows,
          }),
        });

        const body = (await response.json().catch(() => null)) as ApiErrorShape | ImportPreviewRowsResult | null;
        if (!response.ok) {
          setResult(null);
          setError(buildApiErrorMessage(body as ApiErrorShape | null, "Preview request failed."));
          return;
        }

        if (!isPreviewResult(body)) {
          setResult(null);
          setError("Preview response has an unexpected shape.");
          return;
        }

        setResult(body);
      } catch {
        setResult(null);
        setError("Preview request failed.");
      }
    });
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
              onChange={(event) => setSourceType(event.target.value as ImportSourceType)}
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
            onChange={(event) => setRowsJson(event.target.value)}
            rows={12}
            spellCheck={false}
            placeholder={sampleJson}
            className="w-full rounded border border-line bg-surface2 px-3 py-3 font-mono text-sm leading-6 text-ink"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPending}
            className="rounded border border-line bg-surface2 px-3 py-2 text-xs font-black uppercase tracking-[0.06em] text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Previewing..." : "Preview"}
          </button>
          <span className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">Preview only</span>
          <span className="rounded border border-line bg-surface2 px-3 py-2 text-xs text-muted">Confirm import coming later</span>
        </div>

        {error ? (
          <div className="mt-4 rounded border border-negative/30 bg-negative/10 px-3 py-3 text-sm whitespace-pre-wrap text-negative">
            {error}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-line bg-surface p-4 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.08em] text-muted">Preview result</h3>
          <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-muted">
            persisted={String(result?.meta.persisted ?? false)}
          </span>
          <span className="rounded border border-line bg-surface2 px-3 py-1 text-xs text-muted">Preview only</span>
        </div>

        {!result ? (
          <div className="rounded border border-dashed border-line bg-surface2 p-4 text-sm text-muted">
            Submit sample rows to see validation summary, normalized rows and row-level errors.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Total rows</div>
                <div className="mt-2 text-2xl font-black text-navy">{result.summary.totalRows}</div>
              </article>
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Valid rows</div>
                <div className="mt-2 text-2xl font-black text-positive">{result.summary.validRows}</div>
              </article>
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Warning rows</div>
                <div className="mt-2 text-2xl font-black text-warning">{result.summary.warningRows}</div>
              </article>
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Invalid rows</div>
                <div className="mt-2 text-2xl font-black text-negative">{result.summary.invalidRows}</div>
              </article>
              <article className="rounded border border-line bg-surface2 p-3">
                <div className="text-xs font-black uppercase tracking-[0.06em] text-muted">Errors count</div>
                <div className="mt-2 text-2xl font-black text-navy">{result.summary.errorsCount}</div>
              </article>
            </div>

            <div className="rounded border border-line bg-surface2 px-3 py-3 text-xs text-muted">
              <div>Preview only</div>
              <div>persisted=false</div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-4">
              <div className="mb-3 text-sm font-black uppercase tracking-[0.08em] text-muted">Rows preview</div>
              {!result.rowsPreview.length ? (
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
                      {result.rowsPreview.map((row) => (
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
              {!result.errors.length ? (
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
                      {result.errors.map((issue, index) => (
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
          </div>
        )}
      </section>
    </div>
  );
}
