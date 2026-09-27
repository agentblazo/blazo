import type { BlazoError, Log, Run, Span } from "@blazo/types";

const COLLECTOR_URL = (
  process.env.BLAZO_COLLECTOR_URL ??
  process.env.NEXT_PUBLIC_COLLECTOR_URL ??
  "http://127.0.0.1:4318"
).replace(/\/+$/, "");

/** A run together with everything that happened during it. */
export interface RunDetail {
  run: Run;
  spans: Span[];
  logs: Log[];
  errors: BlazoError[];
}

/** Fetch recent runs, newest first. */
export const getRuns = async (limit = 100): Promise<Run[]> => {
  const response = await fetch(`${COLLECTOR_URL}/api/runs?limit=${limit}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`collector returned ${response.status}`);
  }
  const data = (await response.json()) as { runs: Run[] };
  return data.runs;
};

/** Fetch a single run and its spans, logs and errors. */
export const getRun = async (id: string): Promise<RunDetail | null> => {
  const response = await fetch(`${COLLECTOR_URL}/api/runs/${id}`, { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`collector returned ${response.status}`);
  }
  return (await response.json()) as RunDetail;
};

/** The configured collector base URL (exposed for error messages). */
export const collectorUrl = COLLECTOR_URL;
