import type { BlazoError, Finding, Log, Run, Span, StreamEvent } from "@blazo/types";

/** A subscriber to every Blazo stream event. */
export type StreamListener = (event: StreamEvent) => void;

/** In-process pub/sub used to fan domain events out to SSE clients. */
export interface EventHub {
  publish: (event: StreamEvent) => void;
  subscribe: (listener: StreamListener) => () => void;
  listenerCount: () => number;
}

/** Create a new event hub. */
export const createEventHub = (): EventHub => {
  const listeners = new Set<StreamListener>();

  return {
    publish(event) {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (error) {
          console.error("stream listener failed", error);
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    listenerCount() {
      return listeners.size;
    },
  };
};

/** Convenience builders so emitters stay type-safe. */
export const streamEvents = {
  runStarted: (run: Run): StreamEvent => ({ type: "run.started", data: run }),
  runCompleted: (run: Run): StreamEvent => ({ type: "run.completed", data: run }),
  spanCompleted: (span: Span): StreamEvent => ({ type: "span.completed", data: span }),
  logCreated: (log: Log): StreamEvent => ({ type: "log.created", data: log }),
  errorCreated: (error: BlazoError): StreamEvent => ({ type: "error.created", data: error }),
  findingCreated: (finding: Finding): StreamEvent => ({ type: "finding.created", data: finding }),
};
