import { BLAZO_TYPE_ATTR, getTracer } from "@blazo/otel";
import type { SpanType } from "@blazo/types";
import { type Attributes, SpanKind, SpanStatusCode } from "@opentelemetry/api";

/** Options for {@link span}. */
export interface SpanOptions {
  /** Span type recorded on the span. Defaults to `tool`. */
  type?: SpanType;
  /** Extra attributes attached to the span. */
  attributes?: Attributes;
}

/**
 * Wrap a unit of work in a child span of the current run.
 *
 * @example
 * await span("search", () => search(query), { type: "tool" })
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
