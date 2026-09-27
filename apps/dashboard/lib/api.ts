import type { BlazoConfig } from "@blazo/config";
import type { BlazoError, Finding, Log, Run, Span } from "@blazo/types";

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
  findings: Finding[];
}

/** Errors collapsed by signature (from `GET /api/errors`). */
export interface ErrorGroup {
  signature: string;
  type: string;
  message: string;
  count: number;
  firstAt: number;
  lastAt: number;
  runIds: string[];
}

/** Aggregate metrics from `GET /api/overview`. */
export interface OverviewMetrics {
  runs: {
    total: number;
    running: number;
    success: number;
    error: number;
    successRate: number | null;
  };
  duration: { avg: number | null; max: number | null };
  tokens: { total: number | null; avg: number | null };
  cost: { total: number | null };
  calls: { llm: number; tool: number };
  errors: { total: number };
  findings: { total: number; critical: number; warning: number };
}

/** Everything the overview page renders. */
export interface Overview {
  metrics: OverviewMetrics;
  recentRuns: Run[];
  activeRuns: Run[];
  slowRuns: Run[];
  recentFindings: Finding[];
  topErrors: ErrorGroup[];
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

/** Fetch a single run with its spans, logs, errors and findings. */
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

/** Fetch grouped errors. */
export const getErrorGroups = async (): Promise<ErrorGroup[]> => {
  const response = await fetch(`${COLLECTOR_URL}/api/errors`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`collector returned ${response.status}`);
  }
  const data = (await response.json()) as { groups: ErrorGroup[] };
  return data.groups;
};

/** Fetch recent logs, optionally filtered by level. */
export const getLogs = async (level?: string): Promise<Log[]> => {
  const query = level ? `?level=${encodeURIComponent(level)}` : "";
  const response = await fetch(`${COLLECTOR_URL}/api/logs${query}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`collector returned ${response.status}`);
  }
  const data = (await response.json()) as { logs: Log[] };
  return data.logs;
};

/** The configured collector base URL (exposed for error messages). */
export const collectorUrl = COLLECTOR_URL;

/** Fetch the overview payload. */
export const getOverview = async (): Promise<Overview> => {
  const response = await fetch(`${COLLECTOR_URL}/api/overview`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`collector returned ${response.status}`);
  }
  return (await response.json()) as Overview;
};

/** Fetch the collector's effective config. */
export const getConfig = async (): Promise<BlazoConfig> => {
  const response = await fetch(`${COLLECTOR_URL}/api/config`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`collector returned ${response.status}`);
  }
  const data = (await response.json()) as { config: BlazoConfig };
  return data.config;
};
