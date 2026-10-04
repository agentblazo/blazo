/**
 * Span model — a normalized unit of work within a run.
 *
 * @module
 */

import type { Metadata } from "./run";

/**
 * Normalized span type. Driven by the `blazo.type` attribute on OTLP spans,
 * falling back to `agent` for the root span.
 *
 * - `llm` — a model call.
 * - `tool` — tool or function invocation.
 * - `agent` — the agent entry point (the run's root span).
 * - `error` — a span that represents a failure.
 * - `session` — a long-lived grouping span.
 */
export type SpanType = "llm" | "tool" | "agent" | "error" | "session";

/**
 * Lifecycle status of a span.
 *
 * - `running` — started and not yet ended.
 * - `success` — ended with an OK status.
 * - `error` — ended with an error status.
 */
export type SpanStatus = "running" | "success" | "error";

/**
 * A span is a normalized unit of work within a run. It is built from an OTLP
 * span and linked back to its run and parent span.
 *
 * @remarks
 * Timestamps and durations are epoch milliseconds. The root span has
 * `parentId === null`; `duration` is `null` while the span is `running`.
 *
 * @example
 * const span: Span = {
 *   id: "span_456",
 *   runId: "run_123",
 *   parentId: null,
 *   type: "tool",
 *   name: "tool.search",
 *   status: "success",
 *   startedAt: 1735689600000,
 *   endedAt: 1735689600500,
 *   duration: 500,
 *   metadata: { query: "weather" },
 * };
 */
export interface Span {
  /** Unique span identifier. */
  id: string;
  /** Identifier of the run this span belongs to. */
  runId: string;
  /** Parent span id, or `null` for the root span of a run. */
  parentId: string | null;
  /** Normalized span type. */
  type: SpanType;
  /** Human-readable span name (e.g. `tool.search`). */
  name: string;
  /** Current lifecycle status. */
  status: SpanStatus;
  /** Start time, epoch milliseconds. */
  startedAt: number;
  /** End time, epoch milliseconds, or `null` while running. */
  endedAt: number | null;
  /** Duration in milliseconds, or `null` while running. */
  duration: number | null;
  /** Attributes captured on the underlying OTLP span. */
  metadata: Metadata;
}
