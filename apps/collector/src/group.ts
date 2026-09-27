import type { BlazoError } from "@blazo/types";

/** Errors collapsed by signature (type + message). */
export interface ErrorGroup {
  signature: string;
  type: string;
  message: string;
  count: number;
  firstAt: number;
  lastAt: number;
  runIds: string[];
}

/** Group errors by type and message, most frequent first. */
export const groupErrors = (errors: BlazoError[]): ErrorGroup[] => {
  const groups = new Map<string, ErrorGroup>();

  for (const error of errors) {
    const signature = `${error.type}: ${error.message}`;
    const existing = groups.get(signature);
    if (existing) {
      existing.count += 1;
      existing.firstAt = Math.min(existing.firstAt, error.timestamp);
      existing.lastAt = Math.max(existing.lastAt, error.timestamp);
      if (!existing.runIds.includes(error.runId)) {
        existing.runIds.push(error.runId);
      }
    } else {
      groups.set(signature, {
        signature,
        type: error.type,
        message: error.message,
        count: 1,
        firstAt: error.timestamp,
        lastAt: error.timestamp,
        runIds: [error.runId],
      });
    }
  }

  return [...groups.values()].sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
};
