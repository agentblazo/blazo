import { getLogger } from "@blazo/otel";
import type { LogLevel, Metadata } from "@blazo/types";
import { type Attributes, context } from "@opentelemetry/api";
import { SeverityNumber } from "@opentelemetry/api-logs";

const SEVERITY: Record<LogLevel, SeverityNumber> = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
};

/**
 * Emit a structured log line linked to the active span (and therefore run).
 *
 * @remarks
 * Uses the currently active OpenTelemetry context to attach the record to a
 * span. When called outside {@link observe}, the log still exports but has no
 * run association.
 *
 * @param level - Severity level (`trace` | `debug` | `info` | `warn` | `error` | `fatal`).
 * @param message - Human-readable log message.
 * @param metadata - Structured attributes stored alongside the log.
 *
 * @example
 * import { observe, log } from "@blazo/sdk";
 *
 * await observe("research-agent", async () => {
 *   log("info", "agent started", { model: "gpt-4o" });
 *   log("error", "tool failed", { tool: "search" });
 * });
 */
export const log = (level: LogLevel, message: string, metadata: Metadata = {}): void => {
  getLogger("blazo").emit({
    severityNumber: SEVERITY[level],
    severityText: level.toUpperCase(),
    body: message,
    attributes: metadata as Attributes,
    context: context.active(),
  });
};
