/** A captured error, optionally attached to a span. */
export interface BlazoError {
  id: string;
  runId: string;
  spanId: string | null;
  type: string;
  message: string;
  stack: string | null;
  agent: string;
  timestamp: number;
}
