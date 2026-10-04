/**
 * Run model — the top-level unit of observation in Blazo.
 *
 * @module
 */

/**
 * Free-form JSON metadata attached to spans and logs.
 *
 * Values must be JSON-serializable so they can travel through OTLP/HTTP and be
 * persisted in SQLite.
 *
 * @example
 * const metadata: Metadata = { model: "gpt-4o", temperature: 0.2 };
 */
export type Metadata = Record<string, unknown>;

/**
 * Lifecycle status of a run.
 *
 * - `running` — started and still in progress.
 * - `success` — finished without throwing.
 * - `error` — finished by throwing.
 */
export type RunStatus = "running" | "success" | "error";

/**
 * A run is the top-level unit of observation. It is derived from the root span
 * emitted by `observe()` in the SDK.
 *
 * @remarks
 * Timestamps and durations are epoch milliseconds. `duration` is `null` while
 * the run is `running`; `tokens` and `cost` are `null` until a provider reports
 * them, and may stay `null`.
 *
 * @example
 * const run: Run = {
 *   id: "run_123",
 *   agent: "research-agent",
 *   status: "success",
 *   startedAt: 1735689600000,
 *   endedAt: 1735689602000,
 *   duration: 2000,
 *   tokens: null,
 *   cost: null,
 * };
 */
export interface Run {
  /** Unique run identifier. */
  id: string;
  /** Agent name passed to `observe(name, fn)`. */
  agent: string;
  /** Current lifecycle status. */
  status: RunStatus;
  /** Start time, epoch milliseconds. */
  startedAt: number;
  /** End time, epoch milliseconds, or `null` while running. */
  endedAt: number | null;
  /** Total wall-clock duration in milliseconds, or `null` while running. */
  duration: number | null;
  /** Total token usage across the run when known, otherwise `null`. */
  tokens: number | null;
  /** Total cost across the run when known, otherwise `null`. */
  cost: number | null;
}
