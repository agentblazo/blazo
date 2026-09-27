import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import { normalizeLogs, normalizeTraces } from "./normalize";
import type { ExportLogsServiceRequest, ExportTraceServiceRequest } from "./otlp";
import type { Repository } from "./repository";

const readJson = async <T>(c: Context): Promise<T> => {
  const text = await c.req.text();
  return JSON.parse(text) as T;
};

const parseLimit = (raw: string | undefined): number => {
  const value = Number(raw ?? "100");
  if (!Number.isFinite(value)) {
    return 100;
  }
  return Math.min(Math.max(Math.trunc(value), 1), 500);
};

/** Create the collector Hono app backed by a repository. */
export const createApp = (repository: Repository): Hono => {
  const app = new Hono();

  app.use("*", cors());

  app.get("/health", (c) => c.json({ status: "ok", service: "blazo-collector" }));

  app.post("/v1/traces", async (c) => {
    try {
      const payload = await readJson<ExportTraceServiceRequest>(c);
      repository.saveTraces(normalizeTraces(payload));
      return c.json({ partialSuccess: {} });
    } catch (error) {
      console.error("failed to ingest traces", error);
      return c.json({ error: "invalid OTLP trace payload" }, 400);
    }
  });

  app.post("/v1/logs", async (c) => {
    try {
      const payload = await readJson<ExportLogsServiceRequest>(c);
      repository.saveLogs(normalizeLogs(payload));
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
    });
  });

  app.get("/api/runs/:id/events", (c) => {
    const id = c.req.param("id");
    if (!repository.getRun(id)) {
      return c.json({ error: "run not found" }, 404);
    }
    return c.json({ spans: repository.listSpans(id) });
  });

  return app;
};
