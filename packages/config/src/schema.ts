import { z } from "zod";

/** Thresholds for the deterministic detection rules (all values are defaults). */
export const detectionConfigSchema = z.object({
  /** A run longer than this is flagged `long_running`. */
  longRunningMs: z.number().int().positive().default(30_000),
  /** The same tool called this many times is flagged `repeated_tool`. */
  repeatedToolCount: z.number().int().positive().default(3),
  /** The same error raised this many times is flagged `repeated_error`. */
  repeatedErrorCount: z.number().int().positive().default(3),
  /** No event for this long is flagged `no_activity`. */
  noActivityMs: z.number().int().positive().default(30_000),
  /** The same tool repeated this many times is flagged `possible_loop`. */
  loopRepeatCount: z.number().int().positive().default(4),
});

/** Collector HTTP listener settings. */
export const collectorConfigSchema = z.object({
  host: z.string().min(1).default("127.0.0.1"),
  port: z.number().int().min(1).max(65_535).default(4318),
});

/** Dashboard HTTP listener settings. */
export const dashboardConfigSchema = z.object({
  host: z.string().min(1).default("127.0.0.1"),
  port: z.number().int().min(1).max(65_535).default(3000),
});

/** Local SQLite storage settings. */
export const databaseConfigSchema = z.object({
  path: z.string().min(1).default(".blazo/blazo.db"),
});

/** Top-level Blazo configuration contract. */
export const blazoConfigSchema = z.object({
  /** OTLP/HTTP endpoint the SDK exports to. */
  endpoint: z.string().min(1).default("http://127.0.0.1:4318"),
  collector: collectorConfigSchema.default({}),
  dashboard: dashboardConfigSchema.default({}),
  database: databaseConfigSchema.default({}),
  detection: detectionConfigSchema.default({}),
});

export type DetectionConfig = z.infer<typeof detectionConfigSchema>;
export type CollectorConfig = z.infer<typeof collectorConfigSchema>;
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type BlazoConfig = z.infer<typeof blazoConfigSchema>;

/** Resolved configuration used when no config file is present. */
export const defaultConfig: BlazoConfig = blazoConfigSchema.parse({});
