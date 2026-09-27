"use client";

import { LiveDot, useLiveResource } from "@/components/use-live-resource";
import type { ErrorGroup } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

interface ErrorsResponse {
  groups: ErrorGroup[];
}

interface ErrorsViewProps {
  initialGroups: ErrorGroup[];
}

/** Errors grouped by signature, with click-through to affected runs. */
export function ErrorsView({ initialGroups }: ErrorsViewProps) {
  const { data, connected, error } = useLiveResource<ErrorsResponse>(
    { groups: initialGroups },
    "/api/errors?limit=500",
  );
  const groups = data.groups;

  if (error && groups.length === 0) {
    return (
      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Errors</h1>
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
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Errors</h1>
        <div className="flex items-center gap-4">
          <LiveDot connected={connected} />
          <span className="text-sm text-slate-400">{groups.length} signatures</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No errors recorded.
        </div>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => (
            <li
              key={group.signature}
              className="rounded-lg border border-rose-900/40 bg-slate-900/40 p-4"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-rose-300">{group.type}</span>
                  <span className="ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30">
                    {group.count}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-xs text-slate-400">
                  {formatDateTime(group.firstAt)}
                </span>
              </div>
              <div className="mt-1 text-sm text-rose-100">{group.message}</div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400">in runs:</span>
                {group.runIds.map((runId) => (
                  <Link
                    key={runId}
                    href={`/runs/${runId}`}
                    className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-300 hover:bg-slate-700"
                  >
                    {runId.slice(0, 12)}…
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
