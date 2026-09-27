import type { BlazoError } from "./error";
import type { Finding } from "./finding";
import type { Log } from "./log";
import type { Run } from "./run";
import type { Span } from "./span";

/** Event names pushed over the `GET /api/stream` SSE endpoint. */
export type StreamEventType =
  | "run.started"
  | "span.completed"
  | "log.created"
  | "error.created"
  | "finding.created"
  | "run.completed";

/** Payload map for each SSE event name. */
export interface StreamEventPayloads {
  "run.started": Run;
  "span.completed": Span;
  "log.created": Log;
  "error.created": BlazoError;
  "finding.created": Finding;
  "run.completed": Run;
}

/** A discriminated union of every SSE message Blazo can push. */
export type StreamEvent = {
  [K in StreamEventType]: { type: K; data: StreamEventPayloads[K] };
}[StreamEventType];
