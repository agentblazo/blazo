import type { Run } from "@blazo/types";
import type { RunDetail } from "./format";

/** A single decoded SSE message from the collector. */
export interface StreamMessage {
  event: string;
  data: unknown;
}

/** Small HTTP client for the Blazo collector API. */
export interface CollectorClient {
  baseUrl: string;
  health: () => Promise<boolean>;
  listRuns: (limit?: number) => Promise<Run[]>;
  getRun: (id: string) => Promise<RunDetail | null>;
  stream: (signal: AbortSignal) => AsyncGenerator<StreamMessage>;
}

const trimSlash = (url: string): string => url.replace(/\/+$/, "");

/** Create a collector client for the given base URL. */
export const createClient = (baseUrl: string): CollectorClient => {
  const base = trimSlash(baseUrl);

  return {
    baseUrl: base,

    async health() {
      try {
        const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) });
        return response.ok;
      } catch {
        return false;
      }
    },

    async listRuns(limit = 50) {
      const response = await fetch(`${base}/api/runs?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`collector returned ${response.status}`);
      }
      const body = (await response.json()) as { runs: Run[] };
      return body.runs;
    },

    async getRun(id) {
      const response = await fetch(`${base}/api/runs/${id}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`collector returned ${response.status}`);
      }
      return (await response.json()) as RunDetail;
    },

    async *stream(signal) {
      const response = await fetch(`${base}/api/stream`, {
        headers: { accept: "text/event-stream" },
        signal,
      });
      if (!response.ok || !response.body) {
        throw new Error(`collector stream returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!signal.aborted) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          let event = "message";
          let data = "";
          for (const line of chunk.split("\n")) {
            if (line.startsWith("event:")) {
              event = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              data += line.slice(5).trim();
            }
          }
          let parsed: unknown = data;
          try {
            parsed = JSON.parse(data);
          } catch {
            // keep raw string
          }
          yield { event, data: parsed };
        }
      }
    },
  };
};
