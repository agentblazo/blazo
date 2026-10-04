/**
 * OpenTelemetry wiring for Blazo agents.
 *
 * Creates a tracer provider and a logger provider that export over OTLP/HTTP
 * (JSON) to the Blazo collector, plus the small attribute helpers the SDK uses
 * to tag spans.
 *
 * @packageDocumentation
 */

import { type Tracer, trace } from "@opentelemetry/api";
import { type Logger, logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import type { LogRecordExporter } from "@opentelemetry/sdk-logs";
import {
  BatchSpanProcessor,
  NodeTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-node";
import type { SpanExporter } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

/**
 * Attribute key used by Blazo to type a span (`llm` | `tool` | `agent` |
 * `error` | `session`).
 */
export const BLAZO_TYPE_ATTR = "blazo.type";
/** Attribute key marking the root span of a run. */
export const BLAZO_RUN_ATTR = "blazo.run";
/** Attribute key carrying the agent name for a run. */
export const BLAZO_AGENT_ATTR = "blazo.agent";

/** Options accepted by {@link setupTelemetry}. */
export interface TelemetryOptions {
  /**
   * `service.name` resource attribute.
   * @defaultValue `"blazo-agent"`
   */
  serviceName?: string;
  /**
   * `service.version` resource attribute.
   * @defaultValue `"0.0.0"`
   */
  serviceVersion?: string;
  /**
   * Base OTLP/HTTP endpoint, without the `/v1/...` suffix. Falls back to
   * `BLAZO_ENDPOINT`, then `OTEL_EXPORTER_OTLP_ENDPOINT`, then
   * `http://127.0.0.1:4318`.
   */
  endpoint?: string;
  /** Extra headers sent with every OTLP export request. */
  headers?: Record<string, string>;
  /** Extra resource attributes merged into the telemetry resource. */
  attributes?: Record<string, string | number | boolean>;
  /**
   * Override the span exporter. Primarily used by tests; when set, spans are
   * processed synchronously via a simple processor.
   */
  traceExporter?: SpanExporter;
  /**
   * Override the log exporter. Primarily used by tests; when set, logs are
   * processed synchronously via a simple processor.
   */
  logExporter?: LogRecordExporter;
}

let tracerProvider: NodeTracerProvider | undefined;
let loggerProvider: LoggerProvider | undefined;

const resolveEndpoint = (endpoint?: string): string =>
  (
    endpoint ??
    process.env.BLAZO_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    "http://127.0.0.1:4318"
  ).replace(/\/+$/, "");

/**
 * Configure OpenTelemetry tracing and logging for a Blazo agent.
 * Idempotent: calling it more than once has no effect after the first call.
 *
 * @param options - Telemetry options. All fields are optional; omitted values
 * fall back to environment variables or sensible local defaults.
 *
 * @example
 * import { setupTelemetry, shutdownTelemetry } from "@blazo/otel";
 *
 * setupTelemetry({ serviceName: "research-agent", endpoint: "http://127.0.0.1:4318" });
 * // ... run your agent ...
 * await shutdownTelemetry();
 *
 * @see {@link shutdownTelemetry} to flush buffered telemetry before exit.
 */
export const setupTelemetry = (options: TelemetryOptions = {}): void => {
  if (tracerProvider) {
    return;
  }

  const endpoint = resolveEndpoint(options.endpoint);
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: options.serviceName ?? "blazo-agent",
    [ATTR_SERVICE_VERSION]: options.serviceVersion ?? "0.0.0",
    ...options.attributes,
  });

  tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [
      options.traceExporter
        ? new SimpleSpanProcessor(options.traceExporter)
        : new BatchSpanProcessor(
            new OTLPTraceExporter({ url: `${endpoint}/v1/traces`, headers: options.headers }),
            { scheduledDelayMillis: 500 },
          ),
    ],
  });
  tracerProvider.register();

  loggerProvider = new LoggerProvider({
    resource,
    processors: [
      options.logExporter
        ? new SimpleLogRecordProcessor({ exporter: options.logExporter })
        : new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({ url: `${endpoint}/v1/logs`, headers: options.headers }),
            scheduledDelayMillis: 500,
          }),
    ],
  });
  logs.setGlobalLoggerProvider(loggerProvider);
};

/** Whether telemetry has already been configured. @returns `true` once a tracer provider exists. */
export const isTelemetryEnabled = (): boolean => tracerProvider !== undefined;

/**
 * Get a tracer, configuring telemetry with defaults on first use.
 *
 * @param name - Instrumentation scope name. Defaults to `"blazo"`.
 * @returns The OpenTelemetry tracer for `name`.
 */
export const getTracer = (name = "blazo"): Tracer => {
  if (!tracerProvider) {
    setupTelemetry();
  }
  return trace.getTracer(name);
};

/**
 * Get a logger, configuring telemetry with defaults on first use.
 *
 * @param name - Instrumentation scope name. Defaults to `"blazo"`.
 * @returns The OpenTelemetry logger for `name`.
 */
export const getLogger = (name = "blazo"): Logger => {
  if (!loggerProvider) {
    setupTelemetry();
  }
  return logs.getLogger(name);
};

/**
 * Flush and tear down the providers. Safe to call when nothing is configured.
 *
 * @remarks
 * Awaits `forceFlush()` then `shutdown()` on both providers, then resets the
 * module state so {@link setupTelemetry} can be called again. Call this before
 * process exit so buffered spans and logs are exported.
 *
 * @returns A promise that resolves once both providers are flushed and torn down.
 */
export const shutdownTelemetry = async (): Promise<void> => {
  await tracerProvider?.forceFlush();
  await loggerProvider?.forceFlush();
  await tracerProvider?.shutdown();
  await loggerProvider?.shutdown();
  tracerProvider = undefined;
  loggerProvider = undefined;
};
