import type { Metadata } from "./run";

/** Severity levels supported by Blazo logs. */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

/** A log line emitted by an agent, optionally attached to a span. */
export interface Log {
  id: string;
  runId: string;
  spanId: string | null;
  timestamp: number;
  level: LogLevel;
  message: string;
  metadata: Metadata;
}
