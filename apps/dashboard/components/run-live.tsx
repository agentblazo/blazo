"use client";

import { RunDetailView } from "@/components/run-detail-view";
import { useLiveResource } from "@/components/use-live-resource";
import type { RunDetail } from "@/lib/api";

/** Run detail wired to live SSE updates (filtered to this run). */
export function RunLive({ initial }: { initial: RunDetail }) {
  const { data, connected } = useLiveResource<RunDetail>(
    initial,
    `/api/runs/${initial.run.id}`,
    initial.run.id,
  );

  return <RunDetailView detail={data} live={connected} />;
}
