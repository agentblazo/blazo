"use client";

import { StatusBadge } from "@/components/badges";
import { formatCost, formatDateTime, formatDuration, formatTokens } from "@/lib/format";
import type { Run } from "@blazo/types";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const STREAM_EVENTS = [
  "run.started",
  "span.completed",
  "log.created",
  "error.created",
  "finding.created",
  "run.completed",
] as const;

interface RunsViewProps {
  initialRuns: Run[];
  initialError: string | null;
}

/** Runs list with live updates over SSE. */
export function RunsView({ initialRuns, initialError }: RunsViewProps) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [error, setError] = useState<string | null>(initialError);
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/runs?limit=100", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`collector returned ${response.status}`);
      }
      const body = (await response.json()) as { runs: Run[] };
      setRuns(body.runs);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/stream");
    const schedule = () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => void load(), 200);
    };
    const onOpen = () => setConnected(true);
    const onError = () => setConnected(false);

    source.addEventListener("open", onOpen);
    source.addEventListener("error", onError);
    for (const name of STREAM_EVENTS) {
      source.addEventListener(name, schedule);
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      source.close();
    };
  }, [load]);

  const indicator = (
    <span className="inline-flex items-center gap-2 text-xs text-slate-400">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          connected ? "animate-pulse bg-emerald-400" : "bg-slate-600"
        }`}
      />
      {connected ? "live" : "connecting…"}
    </span>
  );

  if (error && runs.length === 0) {
    return (
      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Runs</h1>
          {indicator}
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
        <h1 className="text-xl font-semibold tracking-tight">Runs</h1>
        <div className="flex items-center gap-4">
          {indicator}
          <span className="text-sm text-slate-400">{runs.length} total</span>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No runs yet. Start the collector, then run{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">bun run start</code>{" "}
          in <code className="text-slate-300">examples/basic-agent</code>.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900/60 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <Link href={`/runs/${run.id}`} className="block">
                      <span className="font-medium text-slate-100">{run.agent}</span>
                      <span className="mt-0.5 block font-mono text-xs text-slate-400">
                        {run.id.slice(0, 12)}…
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatDuration(run.duration)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatTokens(run.tokens)}</td>
                  <td className="px-4 py-3 text-slate-300">{formatCost(run.cost)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDateTime(run.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
