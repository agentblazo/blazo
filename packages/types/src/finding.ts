/** Deterministic finding categories produced by the detection package. */
export type FindingType =
  | "long_running"
  | "repeated_tool"
  | "repeated_error"
  | "no_activity"
  | "possible_loop";

/** Severity assigned to a finding. */
export type FindingSeverity = "info" | "warning" | "critical";

/** A deterministic observation about a run (never ML/AI generated). */
export interface Finding {
  id: string;
  runId: string;
  type: FindingType;
  severity: FindingSeverity;
  message: string;
  createdAt: number;
}
