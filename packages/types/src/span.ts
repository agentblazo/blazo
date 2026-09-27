import type { Metadata } from "./run";

/**
 * Normalized span type. Driven by the `blazo.type` attribute on OTLP spans,
 * falling back to `agent` for the root span.
 */
export type SpanType = "llm" | "tool" | "agent" | "error" | "session";

/** Lifecycle status of a span. */
export type SpanStatus = "running" | "success" | "error";

/**
 * A span is a normalized unit of work within a run. It is built from an OTLP
 * span and linked back to its run and parent span.
 */
export interface Span {
  id: string;
  runId: string;
  parentId: string | null;
  type: SpanType;
  name: string;
  status: SpanStatus;
  startedAt: number;
  endedAt: number | null;
  duration: number | null;
  metadata: Metadata;
}
