import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

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

const repoRoot = findRepoRoot();

/** Locate a Chrome binary (agent-browser's Chrome for Testing) to drive. */
const findChrome = (): string => {
  if (process.env.PLAYWRIGHT_CHROME_PATH) {
    return process.env.PLAYWRIGHT_CHROME_PATH;
  }
  const browsers = join(homedir(), ".agent-browser", "browsers");
  try {
    for (const entry of readdirSync(browsers)) {
      const candidate = join(browsers, entry, "chrome");
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  } catch {
    // Fall through to the empty string.
  }
  return "";
};

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    launchOptions: {
      executablePath: findChrome(),
      args: ["--no-sandbox"],
    },
  },
  webServer: [
    {
      command:
        "rm -f /tmp/blazo-e2e/blazo.db*; BLAZO_DB_PATH=/tmp/blazo-e2e/blazo.db BLAZO_COLLECTOR_PORT=4319 bun apps/collector/src/index.ts",
      url: "http://127.0.0.1:4319/health",
      cwd: repoRoot,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "BLAZO_COLLECTOR_URL=http://127.0.0.1:4319 bun x next dev -p 3100",
      url: "http://127.0.0.1:3100",
      cwd: join(repoRoot, "apps", "dashboard"),
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
