/**
 * Realtime stream model — SSE events pushed by the collector.
 *
 * @module
 */

import type { BlazoError } from "./error";
import type { Finding } from "./finding";
import type { Log } from "./log";
import type { Run } from "./run";
import type { Span } from "./span";

/**
 * Event names pushed over the `GET /api/stream` SSE endpoint.
 *
 * - `run.started` — a new root span opened a run.
 * - `span.completed` — a span finished.
 * - `log.created` — a log line was recorded.
 * - `error.created` — an exception was captured.
 * - `finding.created` — a detection rule produced a finding.
 * - `run.completed` — a run finished (successfully or with an error).
 */
export type StreamEventType =
  | "run.started"
  | "span.completed"
  | "log.created"
  | "error.created"
  | "finding.created"
  | "run.completed";

/**
 * Payload map for each SSE event name. The value is the same domain object the
 * corresponding REST endpoint returns.
 */
export interface StreamEventPayloads {
  /** New run started. */
  "run.started": Run;
  /** A span completed. */
  "span.completed": Span;
  /** A log line was created. */
  "log.created": Log;
  /** An error was created. */
  "error.created": BlazoError;
  /** A finding was created. */
  "finding.created": Finding;
  /** A run completed. */
  "run.completed": Run;
}

/**
 * A discriminated union of every SSE message Blazo can push.
 *
 * @remarks
 * Narrow on `type` to get a precisely typed `data` payload.
 *
 * @example
 * source.onmessage = (event) => {
 *   const message = JSON.parse(event.data) as StreamEvent;
 *   if (message.type === "run.completed") {
 *     console.log(message.data.status);
 *   }
 * };
 */
export type StreamEvent = {
  [K in StreamEventType]: { type: K; data: StreamEventPayloads[K] };
}[StreamEventType];
