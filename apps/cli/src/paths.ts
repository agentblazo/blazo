import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Walk up from this file until we find the monorepo root (marked by turbo.json). */
const findRepoRoot = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(dir, "turbo.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return process.cwd();
};

/** Absolute path to the repository root (override with BLAZO_REPO_ROOT). */
export const repoRoot = (): string => process.env.BLAZO_REPO_ROOT ?? findRepoRoot();

/** Entry point for the collector app. */
export const collectorEntry = (): string =>
  join(repoRoot(), "apps", "collector", "src", "index.ts");

/** Working directory for the dashboard app. */
export const dashboardDir = (): string => join(repoRoot(), "apps", "dashboard");
