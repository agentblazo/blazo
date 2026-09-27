"use client";

import { StatusBadge, TypeBadge, levelColor } from "@/components/badges";
import type { RunDetail } from "@/lib/api";
import {
  formatClock,
  formatCost,
  formatDateTime,
  formatDuration,
  formatTokens,
} from "@/lib/format";
import type { Span } from "@blazo/types";
import { useMemo, useState } from "react";

const BAR_COLORS: Record<string, string> = {
  running: "#f59e0b",
  success: "#34d399",
  error: "#fb7185",
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
    <div className="text-[0.65rem] uppercase tracking-wider text-slate-400">{label}</div>
    <div className="mt-1 text-sm font-medium text-slate-100">{value}</div>
  </div>
);

const spanDuration = (span: Span): number =>
  span.endedAt === null ? 0 : (span.duration ?? span.endedAt - span.startedAt);

/** Interactive run detail: hand-built timeline, step inspector, logs and errors. */
export function RunDetailView({ detail }: { detail: RunDetail }) {
  const { run, spans, logs, errors } = detail;
  const [selectedId, setSelectedId] = useState<string | null>(spans[0]?.id ?? null);

  const selected = useMemo(
    () => spans.find((span) => span.id === selectedId) ?? null,
    [spans, selectedId],
  );

  const bounds = useMemo(() => {
    if (spans.length === 0) {
      return { start: run.startedAt, total: Math.max(run.duration ?? 1, 1) };
    }
    const start = Math.min(run.startedAt, ...spans.map((span) => span.startedAt));
    const end = Math.max(
      run.endedAt ?? run.startedAt,
      ...spans.map((span) => span.endedAt ?? span.startedAt),
    );
    return { start, total: Math.max(end - start, 1) };
  }, [spans, run]);

  return (
    <section className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{run.agent}</h1>
          <StatusBadge status={run.status} />
          <span className="font-mono text-xs text-slate-400">{run.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Started" value={formatDateTime(run.startedAt)} />
        <Stat label="Duration" value={formatDuration(run.duration)} />
        <Stat label="Spans" value={String(spans.length)} />
        <Stat label="Tokens" value={formatTokens(run.tokens)} />
        <Stat label="Cost" value={formatCost(run.cost)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Timeline
          </h2>
          {spans.length === 0 ? (
            <p className="text-sm text-slate-400">No spans recorded.</p>
          ) : (
            <div className="space-y-1">
              {spans.map((span) => {
                const duration = spanDuration(span);
                const offset = ((span.startedAt - bounds.start) / bounds.total) * 100;
                const width = Math.max((duration / bounds.total) * 100, 0.75);
                const isSelected = span.id === selectedId;
                return (
                  <button
                    key={span.id}
                    type="button"
                    onClick={() => setSelectedId(span.id)}
                    className={`grid w-full grid-cols-[9rem_1fr] items-center gap-3 rounded px-2 py-1.5 text-left transition ${
                      isSelected ? "bg-slate-800/70" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="flex min-w-0 flex-col">
                      <TypeBadge type={span.type} />
                      <span className="truncate text-sm text-slate-200">{span.name}</span>
                    </span>
                    <span className="relative block h-5 rounded bg-slate-800/50">
                      <span
                        className="absolute inset-y-0 rounded"
                        style={{
                          left: `${offset}%`,
                          width: `${width}%`,
                          backgroundColor: BAR_COLORS[span.status] ?? "#64748b",
                        }}
                        title={`${span.name} · ${formatDuration(duration)}`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Step inspection
          </h2>
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TypeBadge type={selected.type} />
                <span className="text-sm font-medium text-slate-100">{selected.name}</span>
                <StatusBadge status={selected.status} />
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <dt className="text-slate-400">Started</dt>
                <dd className="text-right font-mono text-slate-300">
                  {formatClock(selected.startedAt)}
                </dd>
                <dt className="text-slate-400">Ended</dt>
                <dd className="text-right font-mono text-slate-300">
                  {formatClock(selected.endedAt)}
                </dd>
                <dt className="text-slate-400">Duration</dt>
                <dd className="text-right font-mono text-slate-300">
                  {formatDuration(selected.duration)}
                </dd>
                <dt className="text-slate-400">Span</dt>
                <dd className="truncate text-right font-mono text-slate-300">
                  {selected.id.slice(0, 16)}
                </dd>
                <dt className="text-slate-400">Parent</dt>
                <dd className="truncate text-right font-mono text-slate-300">
                  {selected.parentId ? selected.parentId.slice(0, 16) : "—"}
                </dd>
              </dl>
              <div>
                <div className="mb-1 text-xs text-slate-400">Metadata</div>
                <pre className="max-h-72 overflow-auto rounded bg-slate-950/80 p-3 text-xs text-slate-300">
                  {JSON.stringify(selected.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a span in the timeline.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Logs <span className="text-slate-400">({logs.length})</span>
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-400">No logs recorded.</p>
          ) : (
            <ul className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              {logs.map((entry) => (
                <li key={entry.id} className="flex gap-3 text-xs">
                  <span className="font-mono text-slate-400">{formatClock(entry.timestamp)}</span>
                  <span
                    className={`w-10 shrink-0 font-semibold uppercase ${levelColor(entry.level)}`}
                  >
                    {entry.level}
                  </span>
                  <span className="text-slate-300">{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Errors <span className="text-slate-400">({errors.length})</span>
          </h2>
          {errors.length === 0 ? (
            <p className="text-sm text-slate-400">No errors recorded.</p>
          ) : (
            <ul className="space-y-2">
              {errors.map((error) => (
                <li
                  key={error.id}
                  className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-3 text-xs"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-rose-300">{error.type}</span>
                    <span className="font-mono text-slate-400">{formatClock(error.timestamp)}</span>
                  </div>
                  <div className="mt-1 text-rose-100">{error.message}</div>
                  {error.stack ? (
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[0.7rem] text-rose-200/70">
                      {error.stack}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
