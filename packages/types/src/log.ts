/**
 * Log model — structured log lines emitted by an agent.
 *
 * @module
 */

import type { Metadata } from "./run";

/**
 * Severity levels supported by Blazo logs. Ordered from least to most severe.
 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/**
 * A log line emitted by an agent, optionally attached to a span.
 *
 * @remarks
 * `timestamp` is epoch milliseconds. `spanId` is `null` when the log is emitted
 * outside of any active span; it is otherwise attached to the current span and
 * therefore to its run.
 *
 * @example
 * const entry: Log = {
 *   id: "log_789",
 *   runId: "run_123",
 *   spanId: "span_456",
 *   timestamp: 1735689600000,
 *   level: "info",
 *   message: "agent started",
 *   metadata: { model: "gpt-4o" },
 * };
 */
export interface Log {
  /** Unique log identifier. */
  id: string;
  /** Identifier of the run this log belongs to. */
  runId: string;
  /** Identifier of the span this log is attached to, or `null`. */
  spanId: string | null;
  /** Emission time, epoch milliseconds. */
  timestamp: number;
  /** Severity level. */
  level: LogLevel;
  /** Log message. */
  message: string;
  /** Structured metadata supplied by the caller. */
  metadata: Metadata;
}
