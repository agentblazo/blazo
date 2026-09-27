"use client";

import { RunDetailView } from "@/components/run-detail-view";
import type { RunDetail } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";

const STREAM_EVENTS = [
  "run.started",
  "span.completed",
  "log.created",
  "error.created",
  "finding.created",
  "run.completed",
] as const;

/** Run detail wired to live SSE updates. */
export function RunLive({ initial }: { initial: RunDetail }) {
  const [detail, setDetail] = useState<RunDetail>(initial);
  const [connected, setConnected] = useState(false);
  const runId = initial.run.id;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/runs/${runId}`, { cache: "no-store" });
    if (response.ok) {
      setDetail((await response.json()) as RunDetail);
    }
  }, [runId]);

  useEffect(() => {
    const source = new EventSource("/api/stream");

    const schedule = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { runId?: string; id?: string };
        const eventRunId = data.runId ?? data.id;
        if (eventRunId && eventRunId !== runId) {
          return;
        }
      } catch {
        // Ignore malformed payloads.
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
  }, [runId, load]);

  return <RunDetailView detail={detail} live={connected} />;
}
