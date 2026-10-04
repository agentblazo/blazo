import { BLAZO_AGENT_ATTR, BLAZO_RUN_ATTR, BLAZO_TYPE_ATTR, getTracer } from "@blazo/otel";
import type { SpanType } from "@blazo/types";
import { type Attributes, SpanKind, SpanStatusCode } from "@opentelemetry/api";

/** Options for {@link observe}. */
export interface ObserveOptions {
  /**
   * Span type recorded on the run.
   * @defaultValue `"agent"`
   */
  type?: SpanType;
  /** Extra attributes attached to the root span. */
  attributes?: Attributes;
}

/**
 * Wrap an agent entry point in a root span. The resulting span becomes a
 * Blazo run once it is exported to the collector.
 *
 * @remarks
 * Sets the `blazo.run` marker on the span, records the agent name, and sets the
 * span status to `success` or `error`. On failure the exception is recorded on
 * the span and re-thrown to the caller.
 *
 * @typeParam T - Return type of `fn`.
 * @param name - Run (and root span) name, e.g. `"research-agent"`.
 * @param fn - The agent function to run. May be synchronous or async.
 * @param options - Optional span type and extra attributes.
 * @returns The value returned by `fn`.
 * @throws Rethrows any error thrown by `fn` after recording it on the span.
 *
 * @example
 * import { observe, log, span, shutdown } from "@blazo/sdk";
 *
 * const answer = await observe("research-agent", async () => {
 *   log("info", "agent started", { version: "0.1.0" });
 *   await span("llm.chat", () => callModel(prompt), { type: "llm" });
 *   return "done";
 * });
 *
 * await shutdown();
 */
export const observe = async <T>(
  name: string,
  fn: () => T | Promise<T>,
  options: ObserveOptions = {},
): Promise<T> => {
  const tracer = getTracer("blazo");
  return tracer.startActiveSpan(
    name,
    {
      kind: SpanKind.INTERNAL,
      attributes: {
        [BLAZO_RUN_ATTR]: true,
        [BLAZO_AGENT_ATTR]: name,
        [BLAZO_TYPE_ATTR]: options.type ?? "agent",
        ...options.attributes,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      } finally {
        span.end();
      }
    },
  );
};
