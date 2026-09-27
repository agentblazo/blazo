import type { BlazoError, Log, Run, Span } from "@blazo/types";

/** Thresholds that drive the deterministic rules. */
export interface FindingThresholds {
  longRunningMs: number;
  repeatedToolCount: number;
  repeatedErrorCount: number;
  noActivityMs: number;
  loopRepeatCount: number;
}

/** The run snapshot a detection pass operates on. */
export interface DetectionInput {
  run: Run;
  spans: Span[];
  logs: Log[];
  errors: BlazoError[];
  /** Current time in epoch milliseconds. */
  now: number;
}
