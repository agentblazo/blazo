"use client";

import { StatusBadge, TypeBadge } from "@/components/badges";
import { LiveDot, useLiveResource } from "@/components/use-live-resource";
import type { Overview } from "@/lib/api";
import { formatCost, formatDateTime, formatDuration, formatTokens } from "@/lib/format";
import Link from "next/link";

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
    <div className="text-[0.65rem] uppercase tracking-wider text-slate-400">{label}</div>
    <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">{children}</h2>
);

/** Overview: metrics, active/slow/recent runs, findings and top errors. */
export function OverviewView({ initial }: { initial: Overview }) {
  const { data, connected, error } = useLiveResource<Overview>(initial, "/api/overview");
  const { metrics, activeRuns, slowRuns, recentRuns, recentFindings, topErrors } = data;

  if (error && recentRuns.length === 0) {
    return (
      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <LiveDot connected={connected} />
        </div>
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          Could not reach the collector.
          <div className="mt-1 text-rose-300/80">{error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <LiveDot connected={connected} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Runs" value={String(metrics.runs.total)} />
        <Metric
          label="Success rate"
          value={
            metrics.runs.successRate === null ? "—" : `${metrics.runs.successRate.toFixed(1)}%`
          }
        />
        <Metric label="Avg duration" value={formatDuration(metrics.duration.avg)} />
        <Metric label="Tokens" value={formatTokens(metrics.tokens.total)} />
        <Metric label="Cost" value={formatCost(metrics.cost.total)} />
        <Metric label="LLM calls" value={String(metrics.calls.llm)} />
        <Metric label="Tool calls" value={String(metrics.calls.tool)} />
        <Metric label="Errors" value={String(metrics.errors.total)} />
        <Metric
          label="Findings"
          value={`${metrics.findings.total} (${metrics.findings.critical} crit)`}
        />
        <Metric label="Running" value={String(metrics.runs.running)} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle>Active runs</SectionTitle>
          {activeRuns.length === 0 ? (
            <p className="text-sm text-slate-400">No runs in progress.</p>
          ) : (
            <ul className="space-y-1">
              {activeRuns.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/runs/${run.id}`}
                    className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-slate-800/40"
                  >
                    <span className="flex items-center gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-sm text-slate-200">{run.agent}</span>
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {formatDateTime(run.startedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionTitle>Slowest runs</SectionTitle>
          {slowRuns.length === 0 ? (
            <p className="text-sm text-slate-400">No completed runs yet.</p>
          ) : (
            <ul className="space-y-1">
              {slowRuns.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/runs/${run.id}`}
                    className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-slate-800/40"
                  >
                    <span className="text-sm text-slate-200">{run.agent}</span>
                    <span className="font-mono text-xs text-slate-400">
                      {formatDuration(run.duration)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {recentFindings.length > 0 ? (
        <div>
          <SectionTitle>Recent findings</SectionTitle>
          <ul className="space-y-2">
            {recentFindings.map((finding) => (
              <li key={finding.id}>
                <Link
                  href={`/runs/${finding.runId}`}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                    finding.severity === "critical"
                      ? "border-rose-900/60 bg-rose-950/20 text-rose-200"
                      : finding.severity === "warning"
                        ? "border-amber-900/60 bg-amber-950/20 text-amber-200"
                        : "border-sky-900/60 bg-sky-950/20 text-sky-200"
                  }`}
                >
                  <span className="shrink-0 font-semibold uppercase tracking-wider">
                    <TypeBadge type={finding.type} />
                  </span>
                  <span>{finding.message}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle>Recent runs</SectionTitle>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-slate-400">No runs yet.</p>
          ) : (
            <ul className="space-y-1">
              {recentRuns.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/runs/${run.id}`}
                    className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-slate-800/40"
                  >
                    <StatusBadge status={run.status} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                      {run.agent}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {formatDuration(run.duration)}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {formatDateTime(run.startedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionTitle>Top errors</SectionTitle>
          {topErrors.length === 0 ? (
            <p className="text-sm text-slate-400">No errors recorded.</p>
          ) : (
            <ul className="space-y-1">
              {topErrors.map((group) => (
                <li key={group.signature} className="flex items-baseline gap-3 px-2 py-1.5">
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30">
                    {group.count}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-rose-100">
                    {group.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
