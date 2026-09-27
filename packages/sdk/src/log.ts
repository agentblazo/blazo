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
 * @example
 * log("info", "agent started", { model: "gpt-4o" })
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
