/**
 * Finding model — deterministic observations about a run.
 *
 * @module
 */

/**
 * Deterministic finding categories produced by the detection package.
 *
 * - `long_running` — a run exceeded the duration threshold.
 * - `repeated_tool` — the same tool was called more than the threshold.
 * - `repeated_error` — the same error was raised more than the threshold.
 * - `no_activity` — a running run emitted no event for longer than the threshold.
 * - `possible_loop` — a repeating tool pattern suggests a loop.
 */
export type FindingType =
  | "long_running"
  | "repeated_tool"
  | "repeated_error"
  | "no_activity"
  | "possible_loop";

/**
 * Severity assigned to a finding.
 *
 * - `info` — informational, no action expected.
 * - `warning` — worth investigating.
 * - `critical` — likely a real failure or runaway loop.
 */
export type FindingSeverity = "info" | "warning" | "critical";

/**
 * A deterministic observation about a run (never ML/AI generated).
 *
 * @remarks
 * Findings are derived purely from telemetry; the same input always yields the
 * same findings. `createdAt` is epoch milliseconds and finding ids are stable
 * for a given run, type and target so repeated sweeps do not duplicate them.
 *
 * @example
 * const finding: Finding = {
 *   id: "run_123:repeated_tool:search",
 *   runId: "run_123",
 *   type: "repeated_tool",
 *   severity: "warning",
 *   message: 'Tool "search" called 3 times',
 *   createdAt: 1735689600000,
 * };
 */
export interface Finding {
  /** Stable identifier derived from the run, type and target. */
  id: string;
  /** Identifier of the run this finding belongs to. */
  runId: string;
  /** Finding category. */
  type: FindingType;
  /** Severity assigned by the rule that produced it. */
  severity: FindingSeverity;
  /** Human-readable explanation, including the observed values. */
  message: string;
  /** Time the finding was produced, epoch milliseconds. */
  createdAt: number;
}
