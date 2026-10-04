/**
 * Zod schemas and defaults for `blazo.config.json`.
 *
 * @module
 */

import { z } from "zod";

/**
 * Thresholds for the deterministic detection rules.
 *
 * @remarks
 * Every field has a default, so `detection: {}` is valid.
 */
export const detectionConfigSchema = z.object({
  /**
   * A run longer than this is flagged `long_running`.
   * @defaultValue `30000`
   */
  longRunningMs: z.number().int().positive().default(30_000),
  /**
   * The same tool called this many times is flagged `repeated_tool`.
   * @defaultValue `3`
   */
  repeatedToolCount: z.number().int().positive().default(3),
  /**
   * The same error raised this many times is flagged `repeated_error`.
   * @defaultValue `3`
   */
  repeatedErrorCount: z.number().int().positive().default(3),
  /**
   * No event for this long is flagged `no_activity`.
   * @defaultValue `30000`
   */
  noActivityMs: z.number().int().positive().default(30_000),
  /**
   * The same tool repeated this many times in a row is flagged `possible_loop`.
   * @defaultValue `4`
   */
  loopRepeatCount: z.number().int().positive().default(4),
});

/** Collector HTTP listener settings. */
export const collectorConfigSchema = z.object({
  /**
   * Interface to bind.
   * @defaultValue `"127.0.0.1"`
   */
  host: z.string().min(1).default("127.0.0.1"),
  /**
   * Port to listen on.
   * @defaultValue `4318`
   */
  port: z.number().int().min(1).max(65_535).default(4318),
});

/** Dashboard HTTP listener settings. */
export const dashboardConfigSchema = z.object({
  /**
   * Interface to bind.
   * @defaultValue `"127.0.0.1"`
   */
  host: z.string().min(1).default("127.0.0.1"),
  /**
   * Port to listen on.
   * @defaultValue `3000`
   */
  port: z.number().int().min(1).max(65_535).default(3000),
});

/** Local SQLite storage settings. */
export const databaseConfigSchema = z.object({
  /**
   * SQLite database file path, relative to the project root.
   * @defaultValue `".blazo/blazo.db"`
   */
  path: z.string().min(1).default(".blazo/blazo.db"),
});

/**
 * Top-level Blazo configuration contract, matching `blazo.config.json`.
 *
 * @example
 * import { blazoConfigSchema, type BlazoConfig } from "@blazo/config";
 *
 * const config: BlazoConfig = blazoConfigSchema.parse({
 *   endpoint: "http://127.0.0.1:4318",
 *   detection: { longRunningMs: 60_000 },
 * });
 */
export const blazoConfigSchema = z.object({
  /**
   * OTLP/HTTP endpoint the SDK exports to.
   * @defaultValue `"http://127.0.0.1:4318"`
   */
  endpoint: z.string().min(1).default("http://127.0.0.1:4318"),
  /** Collector listener settings. */
  collector: collectorConfigSchema.default({}),
  /** Dashboard listener settings. */
  dashboard: dashboardConfigSchema.default({}),
  /** SQLite storage settings. */
  database: databaseConfigSchema.default({}),
  /** Detection rule thresholds. */
  detection: detectionConfigSchema.default({}),
});

/** Inferred type of {@link detectionConfigSchema}. */
export type DetectionConfig = z.infer<typeof detectionConfigSchema>;
/** Inferred type of {@link collectorConfigSchema}. */
export type CollectorConfig = z.infer<typeof collectorConfigSchema>;
/** Inferred type of {@link dashboardConfigSchema}. */
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;
/** Inferred type of {@link databaseConfigSchema}. */
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
/** Inferred type of {@link blazoConfigSchema}. */
export type BlazoConfig = z.infer<typeof blazoConfigSchema>;

/**
 * Resolved configuration used when no config file is present.
 *
 * @remarks
 * Equivalent to `blazoConfigSchema.parse({})`; every field is populated.
 */
export const defaultConfig: BlazoConfig = blazoConfigSchema.parse({});
