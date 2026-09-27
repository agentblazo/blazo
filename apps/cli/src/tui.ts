import type { Run } from "@blazo/types";
import { color, padEnd, renderRunsTable } from "./format";

/** State rendered by the `blazo watch` TUI. */
export interface WatchState {
  collectorUrl: string;
  dashboardUrl: string;
  dashboardEnabled: boolean;
  collectorAlive: boolean;
  connected: boolean;
  runs: Run[];
  events: string[];
}

/** Clear the terminal and move the cursor home. */
export const clearScreen = (): void => {
  process.stdout.write("\x1b[2J\x1b[H");
};

/** Colorize a stream event name. */
export const eventBadge = (event: string): string => {
  if (event === "error.created") return color.red(event);
  if (event === "run.completed") return color.green(event);
  if (event === "run.started") return color.yellow(event);
  if (event === "finding.created") return color.magenta(event);
  if (event === "span.completed") return color.blue(event);
  if (event === "log.created") return color.cyan(event);
  return color.gray(event);
};

/** Render the full watch screen as a string. */
export const renderWatch = (state: WatchState): string => {
  const out: string[] = [];

  out.push(color.bold("blazo watch"));
  out.push(
    `  collector  ${state.collectorAlive ? color.green("up") : color.red("down")}  ${color.gray(state.collectorUrl)}`,
  );
  out.push(
    `  dashboard  ${state.dashboardEnabled ? color.cyan(state.dashboardUrl) : color.gray("disabled")}`,
  );
  out.push(
    `  stream     ${state.connected ? color.green("connected") : color.yellow("connecting…")}`,
  );
  out.push("");
  out.push(color.bold("RUNS"));
  out.push(
    state.runs.length > 0
      ? renderRunsTable(state.runs, 10)
      : color.gray("  waiting for runs… start an agent to see it appear live"),
  );
  out.push("");
  out.push(color.bold("EVENTS"));
  out.push(
    state.events.length > 0
      ? state.events
          .slice(-8)
          .map((event) => `  ${event}`)
          .join("\n")
      : color.gray("  —"),
  );
  out.push("");
  out.push(color.gray(`  ${padEnd("", 1)}press Ctrl+C to stop`));

  return out.join("\n");
};
