import type { errors, logs, runs, spans } from "@blazo/database";
import type { LogLevel, Metadata, SpanStatus, SpanType } from "@blazo/types";
import type { InferInsertModel } from "drizzle-orm";
import {
  type ExportLogsServiceRequest,
  type ExportTraceServiceRequest,
  type OtlpSpan,
  type OtlpStatus,
  attributesToObject,
  decodeAnyValue,
  nanosToMillis,
} from "./otlp";

type RunInsert = InferInsertModel<typeof runs>;
type SpanInsert = InferInsertModel<typeof spans>;
type LogInsert = InferInsertModel<typeof logs>;
type ErrorInsert = InferInsertModel<typeof errors>;

const SPAN_TYPES = new Set<SpanType>(["llm", "tool", "agent", "error", "session"]);
const LOG_LEVELS = new Set<LogLevel>(["trace", "debug", "info", "warn", "error", "fatal"]);

const IS_ROOT = (parentSpanId: string | undefined): boolean =>
  parentSpanId === undefined || parentSpanId === "" || /^0+$/.test(parentSpanId);

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
};

const spanStatus = (status: OtlpStatus | undefined, endedAt: number | null): SpanStatus => {
  if (status?.code === 2) {
    return "error";
  }
  if (endedAt !== null) {
    return "success";
  }
  return "running";
};

const logLevel = (level: string | undefined, severityNumber: number | undefined): LogLevel => {
  const lower = level?.toLowerCase();
  if (lower && LOG_LEVELS.has(lower as LogLevel)) {
    return lower as LogLevel;
  }
  const n = severityNumber ?? 0;
  if (n >= 21) return "fatal";
  if (n >= 17) return "error";
  if (n >= 13) return "warn";
  if (n >= 9) return "info";
  if (n >= 5) return "debug";
  return "trace";
};

const bodyToMessage = (body: unknown): string => {
  if (typeof body === "string") {
    return body;
  }
  if (body === undefined || body === null) {
    return "";
  }
  if (typeof body === "object") {
    try {
      return JSON.stringify(body);
    } catch {
      return String(body);
    }
  }
  return String(body);
};

const resourceAgent = (attributes: Record<string, unknown>): string =>
  asString(attributes["service.name"]) ?? "unknown-agent";

/** Traces normalized into run, span and error rows ready to persist. */
export interface NormalizedTraces {
  runs: RunInsert[];
  spans: SpanInsert[];
  errors: ErrorInsert[];
}

/** Logs normalized into log and placeholder run rows ready to persist. */
export interface NormalizedLogs {
  runs: RunInsert[];
  logs: LogInsert[];
}

const normalizeSpan = (
  span: OtlpSpan,
  agent: string,
  errors: ErrorInsert[],
): { run: RunInsert | null; span: SpanInsert } => {
  const attrs = attributesToObject(span.attributes);
  const startedAt = nanosToMillis(span.startTimeUnixNano);
  const endedAt = span.endTimeUnixNano ? nanosToMillis(span.endTimeUnixNano) : null;
  const root = IS_ROOT(span.parentSpanId);
  const declaredType = asString(attrs["blazo.type"]);
  const type: SpanType =
    declaredType && SPAN_TYPES.has(declaredType as SpanType)
      ? (declaredType as SpanType)
      : root
        ? "agent"
        : "tool";
  const status = spanStatus(span.status, endedAt);
  const spanId = span.spanId ?? crypto.randomUUID();
  const runId = span.traceId ?? spanId;

  const spanRow: SpanInsert = {
    id: spanId,
    runId,
    parentId: root ? null : (span.parentSpanId ?? null),
    type,
    name: span.name && span.name.length > 0 ? span.name : type,
    status,
    startedAt,
    endedAt,
    duration: endedAt === null ? null : endedAt - startedAt,
    metadata: attrs as Metadata,
  };

  let exceptionCount = 0;
  for (const [index, event] of (span.events ?? []).entries()) {
    if (event.name !== "exception") {
      continue;
    }
    exceptionCount += 1;
    const eventAttrs = attributesToObject(event.attributes);
    errors.push({
      id: `${spanId}-exception-${index}`,
      runId,
      spanId,
      type: asString(eventAttrs["exception.type"]) ?? "Error",
      message: asString(eventAttrs["exception.message"]) ?? "Unknown error",
      stack: asString(eventAttrs["exception.stacktrace"]) ?? null,
      agent,
      timestamp: event.timeUnixNano ? nanosToMillis(event.timeUnixNano) : startedAt,
    });
  }

  if (status === "error" && exceptionCount === 0) {
    errors.push({
      id: `${spanId}-status`,
      runId,
      spanId,
      type: "Error",
      message: span.status?.message ?? "Span errored",
      stack: null,
      agent,
      timestamp: startedAt,
    });
  }

  if (!root) {
    return { run: null, span: spanRow };
  }

  const runRow: RunInsert = {
    id: runId,
    agent: asString(attrs["blazo.agent"]) ?? agent,
    status,
    startedAt,
    endedAt,
    duration: endedAt === null ? null : endedAt - startedAt,
    tokens: asNumber(attrs["blazo.tokens"]) ?? asNumber(attrs["gen_ai.usage.total_tokens"]) ?? null,
    cost: asNumber(attrs["blazo.cost"]) ?? null,
  };

  return { run: runRow, span: spanRow };
};

/** Normalize an OTLP trace export into run/span/error rows. */
export const normalizeTraces = (payload: ExportTraceServiceRequest): NormalizedTraces => {
  const normalized: NormalizedTraces = { runs: [], spans: [], errors: [] };
  const rootRunIds = new Set<string>();

  for (const resourceSpans of payload.resourceSpans ?? []) {
    const agent = resourceAgent(attributesToObject(resourceSpans.resource?.attributes));
    for (const scopeSpans of resourceSpans.scopeSpans ?? []) {
      for (const span of scopeSpans.spans ?? []) {
        const { run, span: spanRow } = normalizeSpan(span, agent, normalized.errors);
        normalized.spans.push(spanRow);
        if (run) {
          normalized.runs.push(run);
          rootRunIds.add(run.id);
        }
      }
    }
  }

  // A span without a root in the same payload still needs a run to satisfy the FK.
  const firstSpanByRun = new Map<string, SpanInsert>();
  for (const spanRow of normalized.spans) {
    const existing = firstSpanByRun.get(spanRow.runId);
    if (!existing || spanRow.startedAt < existing.startedAt) {
      firstSpanByRun.set(spanRow.runId, spanRow);
    }
  }
  for (const [runId, spanRow] of firstSpanByRun) {
    if (!rootRunIds.has(runId)) {
      normalized.runs.push({
        id: runId,
        agent: "unknown-agent",
        status: spanRow.status,
        startedAt: spanRow.startedAt,
        endedAt: spanRow.endedAt,
        duration: spanRow.duration,
        tokens: null,
        cost: null,
      });
    }
  }

  // A single errored span marks the whole run as errored.
  const erroredRuns = new Set(
    normalized.spans.filter((s) => s.status === "error").map((s) => s.runId),
  );
  for (const run of normalized.runs) {
    if (erroredRuns.has(run.id)) {
      run.status = "error";
    }
  }

  return normalized;
};

/** Normalize an OTLP log export into log rows (plus placeholder runs). */
export const normalizeLogs = (payload: ExportLogsServiceRequest): NormalizedLogs => {
  const normalized: NormalizedLogs = { runs: [], logs: [] };
  const runIds = new Set<string>();

  for (const resourceLogs of payload.resourceLogs ?? []) {
    for (const scopeLogs of resourceLogs.scopeLogs ?? []) {
      for (const [index, record] of (scopeLogs.logRecords ?? []).entries()) {
        const runId = record.traceId;
        if (!runId) {
          continue;
        }
        const timestamp = nanosToMillis(record.timeUnixNano ?? record.observedTimeUnixNano);
        const attrs = attributesToObject(record.attributes);
        normalized.logs.push({
          id: `${runId}:${record.spanId ?? "root"}:${record.timeUnixNano ?? index}:${index}`,
          runId,
          spanId: record.spanId || null,
          timestamp,
          level: logLevel(record.severityText, record.severityNumber),
          message: bodyToMessage(decodeAnyValue(record.body)),
          metadata: attrs as Metadata,
        });
        if (!runIds.has(runId)) {
          runIds.add(runId);
          normalized.runs.push({
            id: runId,
            agent: "unknown-agent",
            status: "running",
            startedAt: timestamp,
            endedAt: null,
            duration: null,
            tokens: null,
            cost: null,
          });
        }
      }
    }
  }

  return normalized;
};
