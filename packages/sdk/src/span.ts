import { BLAZO_TYPE_ATTR, getTracer } from "@blazo/otel";
import type { SpanType } from "@blazo/types";
import { type Attributes, SpanKind, SpanStatusCode } from "@opentelemetry/api";

/** Options for {@link span}. */
export interface SpanOptions {
  /**
   * Span type recorded on the span. Drives dashboard styling.
   * @defaultValue `"tool"`
   */
  type?: SpanType;
  /** Extra attributes attached to the span. */
  attributes?: Attributes;
}

/**
 * Wrap a unit of work in a child span of the current run.
 *
 * @remarks
 * Must be called while a run is active (inside {@link observe}) so the span can
 * be parented and associated with the run. Sets the span status to `success` or
 * `error`; on failure the exception is recorded and re-thrown.
 *
 * @typeParam T - Return type of `fn`.
 * @param name - Span name, e.g. `"tool.search"`.
 * @param fn - The work to run. May be synchronous or async.
 * @param options - Optional span type and extra attributes.
 * @returns The value returned by `fn`.
 * @throws Rethrows any error thrown by `fn` after recording it on the span.
 *
 * @example
 * await span("search", () => search(query), { type: "tool" });
 */
export const span = async <T>(
  name: string,
  fn: () => T | Promise<T>,
  options: SpanOptions = {},
): Promise<T> => {
  const tracer = getTracer("blazo");
  return tracer.startActiveSpan(
    name,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        [BLAZO_TYPE_ATTR]: options.type ?? "tool",
        ...options.attributes,
      },
    },
    async (child) => {
      try {
        const result = await fn();
        child.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        child.recordException(error instanceof Error ? error : new Error(String(error)));
        child.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        child.end();
      }
    },
  );
};
