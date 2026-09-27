import { type BlazoDb, errors, logs, runs, spans } from "@blazo/database";
import type { BlazoError, Log, Run, Span } from "@blazo/types";
import { desc, eq } from "drizzle-orm";
import { type EventHub, streamEvents } from "./events";
import type { NormalizedLogs, NormalizedTraces } from "./normalize";

type RunInsert = typeof runs.$inferInsert;
type SpanInsert = typeof spans.$inferInsert;
type LogInsert = typeof logs.$inferInsert;
type ErrorInsert = typeof errors.$inferInsert;

/** Data-access layer used by the collector HTTP handlers. */
export interface Repository {
  saveTraces: (input: NormalizedTraces) => void;
  saveLogs: (input: NormalizedLogs) => void;
  listRuns: (limit: number) => (typeof runs.$inferSelect)[];
  getRun: (id: string) => typeof runs.$inferSelect | undefined;
  listSpans: (runId: string) => (typeof spans.$inferSelect)[];
  listLogs: (runId: string) => (typeof logs.$inferSelect)[];
  listErrors: (runId: string) => (typeof errors.$inferSelect)[];
}

/** Build a repository around an open Drizzle/SQLite connection. */
export const createRepository = (database: BlazoDb, hub?: EventHub): Repository => {
  const { db } = database;

  const saveRun = (run: RunInsert): void => {
    const existing = db.select().from(runs).where(eq(runs.id, run.id)).get();

    if (!existing) {
      db.insert(runs).values(run).onConflictDoNothing().run();
      hub?.publish(streamEvents.runStarted(run as Run));
      if (run.status !== "running") {
        hub?.publish(streamEvents.runCompleted(run as Run));
      }
      return;
    }

    const status: "running" | "success" | "error" =
      existing.status === "error" || run.status === "error"
        ? "error"
        : run.status === "running"
          ? existing.status
          : (run.status ?? existing.status);

    const merged = {
      agent: run.agent !== "unknown-agent" ? run.agent : existing.agent,
      status,
      startedAt: Math.min(existing.startedAt, run.startedAt),
      endedAt: run.endedAt ?? existing.endedAt,
      duration: run.duration ?? existing.duration,
      tokens: run.tokens ?? existing.tokens,
      cost: run.cost ?? existing.cost,
    };

    db.update(runs).set(merged).where(eq(runs.id, run.id)).run();

    // Publish completion when a run transitions out of `running` (or escalates).
    if (status !== existing.status && status !== "running") {
      hub?.publish(streamEvents.runCompleted({ ...existing, ...merged } as Run));
    }
  };

  const saveSpan = (span: SpanInsert): void => {
    db.insert(spans).values(span).onConflictDoNothing().run();
    hub?.publish(streamEvents.spanCompleted(span as unknown as Span));
  };

  const saveLog = (entry: LogInsert): void => {
    db.insert(logs).values(entry).onConflictDoNothing().run();
    hub?.publish(streamEvents.logCreated(entry as unknown as Log));
  };

  const saveError = (entry: ErrorInsert): void => {
    db.insert(errors).values(entry).onConflictDoNothing().run();
    hub?.publish(streamEvents.errorCreated(entry as BlazoError));
  };

  return {
    saveTraces(input) {
      for (const run of input.runs) saveRun(run);
      for (const span of input.spans) saveSpan(span);
      for (const error of input.errors) saveError(error);
    },
    saveLogs(input) {
      for (const run of input.runs) saveRun(run);
      for (const entry of input.logs) saveLog(entry);
    },
    listRuns(limit) {
      return db.select().from(runs).orderBy(desc(runs.startedAt)).limit(limit).all();
    },
    getRun(id) {
      return db.select().from(runs).where(eq(runs.id, id)).get();
    },
    listSpans(runId) {
      return db.select().from(spans).where(eq(spans.runId, runId)).orderBy(spans.startedAt).all();
    },
    listLogs(runId) {
      return db.select().from(logs).where(eq(logs.runId, runId)).orderBy(logs.timestamp).all();
    },
    listErrors(runId) {
      return db
        .select()
        .from(errors)
        .where(eq(errors.runId, runId))
        .orderBy(errors.timestamp)
        .all();
    },
  };
};
