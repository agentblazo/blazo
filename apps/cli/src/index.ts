#!/usr/bin/env bun
import { cac } from "cac";
import { initCommand } from "./commands/init";
import { type InspectOptions, inspectCommand } from "./commands/inspect";
import { type RunsOptions, runsCommand } from "./commands/runs";
import { type WatchOptions, watchCommand } from "./commands/watch";
import { color } from "./format";

const cli = cac("blazo");

const fail = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(color.red(`error: ${message}`));
  process.exitCode = 1;
};

cli.command("init", "Write a default blazo.config.json").action(() => {
  try {
    initCommand();
  } catch (error) {
    fail(error);
  }
});

cli
  .command("runs", "List recent runs")
  .option("--limit <n>", "Maximum number of runs to show", { default: 50 })
  .option("--json", "Print raw JSON")
  .option("--collector <url>", "Collector base URL")
  .action(async (options: RunsOptions) => {
    try {
      await runsCommand(options);
    } catch (error) {
      fail(error);
    }
  });

cli
  .command("inspect <runId>", "Inspect a single run")
  .option("--json", "Print raw JSON")
  .option("--collector <url>", "Collector base URL")
  .action(async (runId: string, options: InspectOptions) => {
    try {
      await inspectCommand(runId, options);
    } catch (error) {
      fail(error);
    }
  });

cli
  .command("watch", "Start the collector and dashboard with a live TUI")
  .option("--collector <url>", "Collector base URL to attach to / display")
  .option("--no-spawn-collector", "Attach to an existing collector instead of starting one")
  .option("--no-dashboard", "Do not start the dashboard")
  .action(async (options: WatchOptions) => {
    try {
      await watchCommand(options);
    } catch (error) {
      fail(error);
    }
  });

cli.help();
cli.version("0.0.0");

cli.parse();
