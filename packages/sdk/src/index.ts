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
