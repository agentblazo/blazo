/** Free-form JSON metadata attached to spans and logs. */
export type Metadata = Record<string, unknown>;

/** Lifecycle status of a run. */
export type RunStatus = "running" | "success" | "error";

/**
 * A run is the top-level unit of observation. It is derived from the root
 * span emitted by `observe()` in the SDK.
 */
export interface Run {
  id: string;
  agent: string;
  status: RunStatus;
  startedAt: number;
  endedAt: number | null;
  duration: number | null;
  tokens: number | null;
  cost: number | null;
}
