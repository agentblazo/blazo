import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { type BlazoConfig, blazoConfigSchema, defaultConfig } from "./schema";

/** Default config file name looked up in the project root. */
export const CONFIG_FILE_NAME = "blazo.config.json";

/** Type helper for authoring a config file with full autocomplete. */
export const defineConfig = (config: Partial<BlazoConfig>): Partial<BlazoConfig> => config;

/** Absolute path of the config file for a given working directory. */
export const getConfigPath = (cwd: string = process.cwd()): string =>
  join(resolve(cwd), CONFIG_FILE_NAME);

/**
 * Load config from disk, filling missing values with defaults.
 * Returns the defaults when no config file exists.
 */
export const loadConfig = (cwd: string = process.cwd()): BlazoConfig => {
  const path = getConfigPath(cwd);
  if (!existsSync(path)) {
    return defaultConfig;
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return blazoConfigSchema.parse(raw);
};

/** Write config to disk as formatted JSON, creating parent directories. */
export const writeConfig = (config: BlazoConfig, cwd: string = process.cwd()): string => {
  const path = getConfigPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return path;
};
