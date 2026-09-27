"use client";

import { levelColor } from "@/components/badges";
import { LiveDot, useLiveResource } from "@/components/use-live-resource";
import { formatClock } from "@/lib/format";
import type { Log } from "@blazo/types";
import Link from "next/link";
import { useState } from "react";

interface LogsResponse {
  logs: Log[];
}

interface LogsViewProps {
  initialLogs: Log[];
}

const LEVELS = ["all", "trace", "debug", "info", "warn", "error", "fatal"] as const;

/** Recent logs with a level filter, updated live over SSE. */
export function LogsView({ initialLogs }: LogsViewProps) {
  const [level, setLevel] = useState<string>("all");
  const url = level === "all" ? "/api/logs?limit=200" : `/api/logs?level=${level}&limit=200`;
  const { data, connected, error } = useLiveResource<LogsResponse>({ logs: initialLogs }, url);
  const logs = data.logs;

  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Logs</h1>
        <div className="flex items-center gap-4">
          <LiveDot connected={connected} />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            level
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none"
            >
              {LEVELS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          Could not reach the collector.
          <div className="mt-1 text-rose-300/80">{error}</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No logs recorded.
        </div>
      ) : (
        <ul className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          {logs.map((entry) => (
            <li key={entry.id} className="flex gap-3 text-xs">
              <span className="font-mono text-slate-400">{formatClock(entry.timestamp)}</span>
              <span className={`w-10 shrink-0 font-semibold uppercase ${levelColor(entry.level)}`}>
                {entry.level}
              </span>
              <Link
                href={`/runs/${entry.runId}`}
                className="shrink-0 font-mono text-slate-400 hover:text-slate-200"
              >
                {entry.runId.slice(0, 8)}
              </Link>
              <span className="text-slate-300">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
