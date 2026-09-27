import { type Tracer, trace } from "@opentelemetry/api";
import { type Logger, logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

/** Attribute key used by Blazo to type a span (llm|tool|agent|error|session). */
export const BLAZO_TYPE_ATTR = "blazo.type";
/** Attribute key marking the root span of a run. */
export const BLAZO_RUN_ATTR = "blazo.run";
/** Attribute key carrying the agent name for a run. */
export const BLAZO_AGENT_ATTR = "blazo.agent";

/** Options accepted by {@link setupTelemetry}. */
export interface TelemetryOptions {
  /** `service.name` resource attribute. Defaults to `blazo-agent`. */
  serviceName?: string;
  /** `service.version` resource attribute. Defaults to `0.0.0`. */
  serviceVersion?: string;
  /** Base OTLP/HTTP endpoint (no `/v1/...` suffix). */
  endpoint?: string;
  /** Extra headers sent with every OTLP export request. */
  headers?: Record<string, string>;
  /** Extra resource attributes merged into the telemetry resource. */
  attributes?: Record<string, string | number | boolean>;
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
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${endpoint}/v1/traces`, headers: options.headers }),
        { scheduledDelayMillis: 500 },
      ),
    ],
  });
  tracerProvider.register();

  loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${endpoint}/v1/logs`, headers: options.headers }),
        scheduledDelayMillis: 500,
      }),
    ],
  });
  logs.setGlobalLoggerProvider(loggerProvider);
};

/** Whether telemetry has already been configured. */
export const isTelemetryEnabled = (): boolean => tracerProvider !== undefined;

/** Get a tracer, configuring telemetry with defaults on first use. */
export const getTracer = (name = "blazo"): Tracer => {
  if (!tracerProvider) {
    setupTelemetry();
  }
  return trace.getTracer(name);
};

/** Get a logger, configuring telemetry with defaults on first use. */
export const getLogger = (name = "blazo"): Logger => {
  if (!loggerProvider) {
    setupTelemetry();
  }
  return logs.getLogger(name);
};

/** Flush and tear down the providers. Safe to call when nothing is configured. */
export const shutdownTelemetry = async (): Promise<void> => {
  await tracerProvider?.forceFlush();
  await loggerProvider?.forceFlush();
  await tracerProvider?.shutdown();
  await loggerProvider?.shutdown();
  tracerProvider = undefined;
  loggerProvider = undefined;
};
