/**
 * Input and threshold contracts for the detection rules.
 *
 * @module
 */

import type { BlazoError, Log, Run, Span } from "@blazo/types";

/**
 * Thresholds that drive the deterministic rules.
 *
 * @remarks
 * Derived from `blazo.config.json` (`detection` section). See
 * `@blazo/config` for defaults and validation.
 */
export interface FindingThresholds {
  /** A run longer than this (ms) is flagged `long_running`. */
  longRunningMs: number;
  /** The same tool called this many times is flagged `repeated_tool`. */
  repeatedToolCount: number;
  /** The same error raised this many times is flagged `repeated_error`. */
  repeatedErrorCount: number;
  /** No event for this long (ms) is flagged `no_activity`. */
  noActivityMs: number;
  /** The same tool repeated this many times consecutively is flagged `possible_loop`. */
  loopRepeatCount: number;
}

/**
 * The run snapshot a detection pass operates on.
 *
 * @example
 * const input: DetectionInput = {
 *   run,
 *   spans: runSpans,
 *   logs: runLogs,
 *   errors: runErrors,
 *   now: Date.now(),
 * };
 */
export interface DetectionInput {
  /** The run being evaluated. */
  run: Run;
  /** All spans recorded for the run. */
  spans: Span[];
  /** All logs recorded for the run. */
  logs: Log[];
  /** All errors recorded for the run. */
  errors: BlazoError[];
  /** Current time in epoch milliseconds. */
  now: number;
}
