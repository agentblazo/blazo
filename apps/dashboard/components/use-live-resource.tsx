"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STREAM_EVENTS = [
  "run.started",
  "span.completed",
  "log.created",
  "error.created",
  "finding.created",
  "run.completed",
] as const;

/** A resource that refetches itself whenever relevant SSE events arrive. */
export interface LiveResource<T> {
  data: T;
  connected: boolean;
  error: string | null;
}

/**
 * Fetch a JSON resource on mount and refresh it on SSE events.
 * When `filterRunId` is set, only events for that run trigger a refresh.
 */
export const useLiveResource = <T,>(
  initial: T,
  url: string,
  filterRunId?: string,
): LiveResource<T> => {
  const [data, setData] = useState<T>(initial);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`collector returned ${response.status}`);
      }
      setData((await response.json()) as T);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [url]);

  useEffect(() => {
    void load();
    const source = new EventSource("/api/stream");

    const schedule = (event: MessageEvent<string>) => {
      if (filterRunId) {
        try {
          const payload = JSON.parse(event.data) as { runId?: string; id?: string };
          const eventRunId = payload.runId ?? payload.id;
          if (eventRunId && eventRunId !== filterRunId) {
            return;
          }
        } catch {
          // Ignore malformed payloads.
        }
      }
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
      source.addEventListener(name, schedule as EventListener);
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      source.close();
    };
  }, [load, filterRunId]);

  return { data, connected, error };
};

/** Small connection indicator used across the live views. */
export const LiveDot = ({ connected }: { connected: boolean }) => (
  <span className="inline-flex items-center gap-2 text-xs text-slate-400">
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        connected ? "animate-pulse bg-emerald-400" : "bg-slate-600"
      }`}
    />
    {connected ? "live" : "connecting…"}
  </span>
);
