import { type BlazoDb, errors, findings, logs, runs, spans } from "@blazo/database";
import type { BlazoError, Finding, Log, Run, Span } from "@blazo/types";
import { desc, eq } from "drizzle-orm";
import { type EventHub, streamEvents } from "./events";
import type { NormalizedLogs, NormalizedTraces } from "./normalize";

type RunInsert = typeof runs.$inferInsert;
type SpanInsert = typeof spans.$inferInsert;
type LogInsert = typeof logs.$inferInsert;
type ErrorInsert = typeof errors.$inferInsert;
type FindingInsert = typeof findings.$inferInsert;

/** A run together with all of its related rows. */
export interface RunSnapshot {
  run: Run;
  spans: Span[];
  logs: Log[];
  errors: BlazoError[];
}

/** Data-access layer used by the collector HTTP handlers. */
export interface Repository {
  saveTraces: (input: NormalizedTraces) => string[];
  saveLogs: (input: NormalizedLogs) => string[];
  saveFinding: (finding: FindingInsert) => void;
  listRuns: (limit: number) => (typeof runs.$inferSelect)[];
  getRun: (id: string) => typeof runs.$inferSelect | undefined;
  getRunSnapshot: (id: string) => RunSnapshot | undefined;
  listSpans: (runId: string) => (typeof spans.$inferSelect)[];
  listLogs: (runId: string) => (typeof logs.$inferSelect)[];
  listErrors: (runId: string) => (typeof errors.$inferSelect)[];
  listFindings: (runId: string) => (typeof findings.$inferSelect)[];
  listRunningRuns: () => (typeof runs.$inferSelect)[];
  listAllErrors: (limit: number) => BlazoError[];
  listAllLogs: (level: string | undefined, limit: number) => Log[];
  listAllFindings: (limit: number) => (typeof findings.$inferSelect)[];
}

const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
type Level = (typeof LEVELS)[number];

const isLevel = (value: string): value is Level => (LEVELS as readonly string[]).includes(value);

/** Build a repository around an open Drizzle/SQLite connection. */
export const createRepository = (database: BlazoDb, hub?: EventHub): Repository => {
  const { db } = database;

  /** Number of rows changed by a `.run()` call (0 when an upsert was a no-op). */
  const changed = (result: unknown): number =>
    typeof result === "object" && result !== null && "changes" in result
      ? Number((result as { changes: unknown }).changes)
      : 1;

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

    if (status !== existing.status && status !== "running") {
      hub?.publish(streamEvents.runCompleted({ ...existing, ...merged } as Run));
    }
  };

  const saveSpan = (span: SpanInsert): void => {
    const result = db.insert(spans).values(span).onConflictDoNothing().run();
    if (changed(result) > 0) {
      hub?.publish(streamEvents.spanCompleted(span as unknown as Span));
    }
  };

  const saveLog = (entry: LogInsert): void => {
    const result = db.insert(logs).values(entry).onConflictDoNothing().run();
    if (changed(result) > 0) {
      hub?.publish(streamEvents.logCreated(entry as unknown as Log));
    }
  };

  const saveError = (entry: ErrorInsert): void => {
    const result = db.insert(errors).values(entry).onConflictDoNothing().run();
    if (changed(result) > 0) {
      hub?.publish(streamEvents.errorCreated(entry as BlazoError));
    }
  };

  const listSpans = (runId: string) =>
    db.select().from(spans).where(eq(spans.runId, runId)).orderBy(spans.startedAt).all();
  const listLogs = (runId: string) =>
    db.select().from(logs).where(eq(logs.runId, runId)).orderBy(logs.timestamp).all();
  const listErrors = (runId: string) =>
    db.select().from(errors).where(eq(errors.runId, runId)).orderBy(errors.timestamp).all();

  return {
    saveTraces(input) {
      const affected = new Set<string>();
      for (const run of input.runs) {
        saveRun(run);
        affected.add(run.id);
      }
      for (const span of input.spans) {
        saveSpan(span);
        affected.add(span.runId);
      }
      for (const error of input.errors) {
        saveError(error);
        affected.add(error.runId);
      }
      return [...affected];
    },
    saveLogs(input) {
      const affected = new Set<string>();
      for (const run of input.runs) {
        saveRun(run);
        affected.add(run.id);
      }
      for (const entry of input.logs) {
        saveLog(entry);
        affected.add(entry.runId);
      }
      return [...affected];
    },
    saveFinding(finding) {
      const result = db.insert(findings).values(finding).onConflictDoNothing().run();
      if (changed(result) > 0) {
        hub?.publish(streamEvents.findingCreated(finding as Finding));
      }
    },
    listRuns(limit) {
      return db.select().from(runs).orderBy(desc(runs.startedAt)).limit(limit).all();
    },
    getRun(id) {
      return db.select().from(runs).where(eq(runs.id, id)).get();
    },
    getRunSnapshot(id) {
      const run = db.select().from(runs).where(eq(runs.id, id)).get();
      if (!run) {
        return undefined;
      }
      return {
        run: run as Run,
        spans: listSpans(id) as unknown as Span[],
        logs: listLogs(id) as unknown as Log[],
        errors: listErrors(id) as unknown as BlazoError[],
      };
    },
    listSpans,
    listLogs,
    listErrors,
    listFindings(runId) {
      return db
        .select()
        .from(findings)
        .where(eq(findings.runId, runId))
        .orderBy(desc(findings.createdAt))
        .all();
    },
    listRunningRuns() {
      return db.select().from(runs).where(eq(runs.status, "running")).all();
    },
    listAllErrors(limit) {
      return db
        .select()
        .from(errors)
        .orderBy(desc(errors.timestamp))
        .limit(limit)
        .all() as unknown as BlazoError[];
    },
    listAllLogs(level, limit) {
      const query = db.select().from(logs);
      const rows =
        level && isLevel(level)
          ? query.where(eq(logs.level, level)).orderBy(desc(logs.timestamp)).limit(limit).all()
          : query.orderBy(desc(logs.timestamp)).limit(limit).all();
      return rows as unknown as Log[];
    },
    listAllFindings(limit) {
      return db.select().from(findings).orderBy(desc(findings.createdAt)).limit(limit).all();
    },
  };
};
