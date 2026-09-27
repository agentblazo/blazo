import type { StreamEvent } from "@blazo/types";
import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import type { Detector } from "./detector";
import type { EventHub } from "./events";
import { groupErrors } from "./group";
import { normalizeLogs, normalizeTraces } from "./normalize";
import type { ExportLogsServiceRequest, ExportTraceServiceRequest } from "./otlp";
import type { Repository } from "./repository";

const readJson = async <T>(c: Context): Promise<T> => {
  const text = await c.req.text();
  return JSON.parse(text) as T;
};

const parseLimit = (raw: string | undefined, fallback = 100): number => {
  const value = Number(raw ?? String(fallback));
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(value), 1), 500);
};

/** Create the collector Hono app backed by a repository, event hub and detector. */
export const createApp = (repository: Repository, hub: EventHub, detector: Detector): Hono => {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) => c.json({ status: "ok", service: "blazo-collector" }));

  app.post("/v1/traces", async (c) => {
    try {
      const payload = await readJson<ExportTraceServiceRequest>(c);
      const affected = repository.saveTraces(normalizeTraces(payload));
      for (const runId of affected) {
        detector.runFor(runId);
      }
      return c.json({ partialSuccess: {} });
    } catch (error) {
      console.error("failed to ingest traces", error);
      return c.json({ error: "invalid OTLP trace payload" }, 400);
    }
  });

  app.post("/v1/logs", async (c) => {
    try {
      const payload = await readJson<ExportLogsServiceRequest>(c);
      const affected = repository.saveLogs(normalizeLogs(payload));
      for (const runId of affected) {
        detector.runFor(runId);
      }
      return c.json({ partialSuccess: {} });
    } catch (error) {
      console.error("failed to ingest logs", error);
      return c.json({ error: "invalid OTLP log payload" }, 400);
    }
  });

  app.get("/api/runs", (c) => {
    const limit = parseLimit(c.req.query("limit"));
    return c.json({ runs: repository.listRuns(limit) });
  });

  app.get("/api/runs/:id", (c) => {
    const run = repository.getRun(c.req.param("id"));
    if (!run) {
      return c.json({ error: "run not found" }, 404);
    }
    return c.json({
      run,
      spans: repository.listSpans(run.id),
      logs: repository.listLogs(run.id),
      errors: repository.listErrors(run.id),
      findings: repository.listFindings(run.id),
    });
  });

  app.get("/api/runs/:id/events", (c) => {
    const id = c.req.param("id");
    if (!repository.getRun(id)) {
      return c.json({ error: "run not found" }, 404);
    }
    return c.json({ spans: repository.listSpans(id) });
  });

  app.get("/api/errors", (c) => {
    const limit = parseLimit(c.req.query("limit"), 500);
    return c.json({ groups: groupErrors(repository.listAllErrors(limit)) });
  });

  app.get("/api/logs", (c) => {
    const limit = parseLimit(c.req.query("limit"), 200);
    return c.json({ logs: repository.listAllLogs(c.req.query("level"), limit) });
  });

  app.get("/api/findings", (c) => {
    const limit = parseLimit(c.req.query("limit"), 200);
    return c.json({ findings: repository.listAllFindings(limit) });
  });

  app.get("/api/stream", (c) =>
    streamSSE(c, async (stream) => {
      const queue: StreamEvent[] = [];
      let wake: (() => void) | undefined;

      const unsubscribe = hub.subscribe((event) => {
        queue.push(event);
        wake?.();
        wake = undefined;
      });
      stream.onAbort(() => {
        unsubscribe();
        wake?.();
        wake = undefined;
      });

      await stream.writeSSE({ event: "ready", data: JSON.stringify({ listener: "ok" }) });

      while (!stream.aborted) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
        while (queue.length > 0 && !stream.aborted) {
          const event = queue.shift();
          if (event) {
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event.data),
            });
          }
        }
      }
    }),
  );

  return app;
};
