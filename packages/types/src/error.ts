/**
 * Error model — captured exceptions linked to a run.
 *
 * @module
 */

/**
 * A captured error, optionally attached to a span.
 *
 * @remarks
 * `timestamp` is epoch milliseconds. `spanId` is `null` when the error is not
 * associated with a specific span. `type` is the error class name (or
 * `"Error"` when it cannot be determined).
 *
 * @example
 * const error: BlazoError = {
 *   id: "err_001",
 *   runId: "run_123",
 *   spanId: "span_456",
 *   type: "TypeError",
 *   message: "search is not a function",
 *   stack: "TypeError: search is not a function\n    at ...",
 *   agent: "research-agent",
 *   timestamp: 1735689600000,
 * };
 */
export interface BlazoError {
  /** Unique error identifier. */
  id: string;
  /** Identifier of the run this error belongs to. */
  runId: string;
  /** Identifier of the span this error is attached to, or `null`. */
  spanId: string | null;
  /** Error class name (e.g. `TypeError`). */
  type: string;
  /** Error message. */
  message: string;
  /** Captured stack trace, or `null` when unavailable. */
  stack: string | null;
  /** Agent that produced the error. */
  agent: string;
  /** Capture time, epoch milliseconds. */
  timestamp: number;
}
