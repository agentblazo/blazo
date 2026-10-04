/**
 * Load and write `blazo.config.json` with validation and defaults.
 *
 * @module
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { type BlazoConfig, blazoConfigSchema, defaultConfig } from "./schema";

/** Default config file name looked up in the project root. */
export const CONFIG_FILE_NAME = "blazo.config.json";

/**
 * Type helper for authoring a config file with full autocomplete.
 *
 * @param config - Partial configuration; missing fields fall back to defaults
 * when loaded by {@link loadConfig}.
 * @returns The same object, typed as a partial {@link BlazoConfig}.
 *
 * @example
 * import { defineConfig } from "@blazo/config";
 *
 * export default defineConfig({
 *   endpoint: "http://127.0.0.1:4318",
 *   detection: { repeatedToolCount: 5 },
 * });
 */
export const defineConfig = (config: Partial<BlazoConfig>): Partial<BlazoConfig> => config;

/**
 * Absolute path of the config file for a given working directory.
 *
 * @param cwd - Directory to resolve against. Defaults to `process.cwd()`.
 * @returns Absolute path to `blazo.config.json`.
 */
export const getConfigPath = (cwd: string = process.cwd()): string =>
  join(resolve(cwd), CONFIG_FILE_NAME);

/**
 * Load config from disk, filling missing values with defaults.
 * Returns the defaults when no config file exists.
 *
 * @param cwd - Directory to look in. Defaults to `process.cwd()`.
 * @returns A fully resolved {@link BlazoConfig}.
 * @throws If the file exists but is not valid JSON, or fails schema
 * validation.
 *
 * @example
 * const config = loadConfig();
 * console.log(config.collector.port); // 4318
 */
export const loadConfig = (cwd: string = process.cwd()): BlazoConfig => {
  const path = getConfigPath(cwd);
  if (!existsSync(path)) {
    return defaultConfig;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return blazoConfigSchema.parse(raw);
};

/**
 * Write config to disk as formatted JSON, creating parent directories.
 *
 * @param config - Configuration to persist.
 * @param cwd - Directory to write into. Defaults to `process.cwd()`.
 * @returns Absolute path of the written file.
 *
 * @example
 * writeConfig(defaultConfig);
 */
export const writeConfig = (config: BlazoConfig, cwd: string = process.cwd()): string => {
  const path = getConfigPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return path;
};
