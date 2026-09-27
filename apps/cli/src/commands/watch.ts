import { mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadConfig } from "@blazo/config";
import { createClient } from "../client";
import { color, formatClock } from "../format";
import { collectorEntry, dashboardDir, repoRoot } from "../paths";
import { type WatchState, clearScreen, eventBadge, renderWatch } from "../tui";

/** Options accepted by `blazo watch`. */
export interface WatchOptions {
  /** Collector base URL to attach to / display. */
  collector?: string;
  /** Start the collector process (disable with `--no-spawn-collector`). */
  spawnCollector?: boolean;
  /** Start the dashboard process (disable with `--no-dashboard`). */
  dashboard?: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** `blazo watch` — start the stack and show a live TUI of runs and events. */
export const watchCommand = async (options: WatchOptions): Promise<void> => {
  const config = loadConfig();
  const baseUrl = (options.collector ?? config.endpoint).replace(/\/+$/, "");
  const dashboardUrl = `http://${config.dashboard.host}:${config.dashboard.port}`;
  const dashboardEnabled = options.dashboard !== false;
  const databasePath = resolve(process.env.BLAZO_DB_PATH ?? config.database.path);
  const logDir = dirname(databasePath);
  mkdirSync(logDir, { recursive: true });

  const children: Bun.Subprocess[] = [];

  const spawnChild = (
    label: string,
    cmd: string[],
    cwd: string,
    env: Record<string, string | undefined>,
  ): void => {
    const fd = openSync(resolve(logDir, `${label}.log`), "a");
    const child = Bun.spawn(cmd, { cwd, env, stdout: fd, stderr: fd, stdin: "ignore" });
    children.push(child);
  };

  if (options.spawnCollector !== false) {
    spawnChild("collector", ["bun", collectorEntry()], repoRoot(), {
      ...process.env,
      BLAZO_DB_PATH: databasePath,
    });
  }

  if (dashboardEnabled) {
    spawnChild("dashboard", ["bun", "run", "dev"], dashboardDir(), {
      ...process.env,
      BLAZO_COLLECTOR_URL: baseUrl,
    });
  }

  const client = createClient(baseUrl);
  const state: WatchState = {
    collectorUrl: baseUrl,
    dashboardUrl,
    dashboardEnabled,
    collectorAlive: false,
    connected: false,
    runs: [],
    events: [],
  };

  const render = (): void => {
    clearScreen();
    process.stdout.write(renderWatch(state));
  };

  const refreshRuns = async (): Promise<void> => {
    try {
      state.runs = await client.listRuns(20);
      state.collectorAlive = true;
    } catch {
      state.collectorAlive = false;
    }
  };

  // Wait briefly for the collector to accept connections.
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline && !(await client.health())) {
    await sleep(250);
  }

  await refreshRuns();
  render();

  const abort = new AbortController();
  const interval = setInterval(() => {
    void refreshRuns().then(render);
  }, 2500);

  const consume = async (): Promise<void> => {
    while (!abort.signal.aborted) {
      try {
        for await (const message of client.stream(abort.signal)) {
          if (message.event === "ready") {
            state.connected = true;
            render();
            continue;
          }
          state.events.push(`${formatClock(Date.now())}  ${eventBadge(message.event)}`);
          if (message.event === "run.started" || message.event === "run.completed") {
            await refreshRuns();
          }
          render();
        }
        state.connected = false;
        render();
      } catch {
        if (abort.signal.aborted) {
          return;
        }
        state.connected = false;
        render();
        await sleep(1000);
      }
    }
  };

  let stopped = false;
  const shutdown = (): void => {
    if (stopped) {
      return;
    }
    stopped = true;
    abort.abort();
    clearInterval(interval);
    for (const child of children) {
      child.kill();
    }
    process.stdout.write(`\n${color.gray("blazo watch stopped")}\n`);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await consume();
};
