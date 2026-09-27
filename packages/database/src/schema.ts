import type { Metadata } from "@blazo/types";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Observed runs, derived from the root span emitted by `observe()`. */
export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    agent: text("agent").notNull(),
    status: text("status", { enum: ["running", "success", "error"] })
      .notNull()
      .default("running"),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"),
    duration: integer("duration"),
    tokens: integer("tokens"),
    cost: real("cost"),
  },
  (table) => [index("runs_started_at_idx").on(table.startedAt)],
);

/** Normalized spans belonging to a run. */
export const spans = sqliteTable(
  "spans",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    type: text("type", { enum: ["llm", "tool", "agent", "error", "session"] }).notNull(),
    name: text("name").notNull(),
    status: text("status", { enum: ["running", "success", "error"] })
      .notNull()
      .default("running"),
    startedAt: integer("started_at").notNull(),
    endedAt: integer("ended_at"),
    duration: integer("duration"),
    metadata: text("metadata", { mode: "json" }).$type<Metadata>(),
  },
  (table) => [
    index("spans_run_id_idx").on(table.runId),
    index("spans_parent_id_idx").on(table.parentId),
  ],
);

/** Log lines emitted within runs. */
export const logs = sqliteTable(
  "logs",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    spanId: text("span_id"),
    timestamp: integer("timestamp").notNull(),
    level: text("level", {
      enum: ["trace", "debug", "info", "warn", "error", "fatal"],
    })
      .notNull()
      .default("info"),
    message: text("message").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Metadata>(),
  },
  (table) => [index("logs_run_id_idx").on(table.runId)],
);

/** Errors raised within runs. */
export const errors = sqliteTable(
  "errors",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    spanId: text("span_id"),
    type: text("type").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    agent: text("agent").notNull(),
    timestamp: integer("timestamp").notNull(),
  },
  (table) => [index("errors_run_id_idx").on(table.runId)],
);

/** Deterministic findings produced by the detection package. */
export const findings = sqliteTable(
  "findings",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["long_running", "repeated_tool", "repeated_error", "no_activity", "possible_loop"],
    }).notNull(),
    severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
    message: text("message").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("findings_run_id_idx").on(table.runId)],
);
