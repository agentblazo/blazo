/**
 * Blazo agent SDK.
 *
 * A tiny, OpenTelemetry-based API for instrumenting AI agents:
 *
 * - {@link observe} — wrap an agent entry point in a run.
 * - {@link span} — wrap a unit of work inside a run.
 * - {@link log} — emit a structured log line attached to the active span.
 * - {@link configure} / {@link shutdown} — manage the telemetry providers.
 *
 * @packageDocumentation
 */

export {
  setupTelemetry as configure,
  setupTelemetry,
  shutdownTelemetry,
  shutdownTelemetry as shutdown,
} from "@blazo/otel";
export { log } from "./log";
export { observe } from "./observe";
export { span } from "./span";
export type { ObserveOptions } from "./observe";
export type { SpanOptions } from "./span";
