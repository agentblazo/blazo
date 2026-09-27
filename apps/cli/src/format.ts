import type { BlazoError, Finding, Log, Run, Span } from "@blazo/types";

const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const wrap =
  (code: string) =>
  (value: string): string =>
    `${ESC}${code}m${value}${RESET}`;

/** Minimal ANSI color helpers (no dependency). */
export const color = {
  dim: wrap("2"),
  bold: wrap("1"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  blue: wrap("34"),
  magenta: wrap("35"),
  cyan: wrap("36"),
  gray: wrap("90"),
};

/** A run together with everything that happened during it. */
export interface RunDetail {
  run: Run;
  spans: Span[];
  logs: Log[];
  errors: BlazoError[];
  findings: Finding[];
}

/** Truncate a string to `width` visible characters. */
export const truncate = (value: string, width: number): string =>
  value.length <= width ? value : `${value.slice(0, Math.max(width - 1, 0))}…`;

/** Pad a string on the right to `width` visible characters. */
export const padEnd = (value: string, width: number): string =>
  value + " ".repeat(Math.max(width - value.length, 0));

/** Format a duration in milliseconds. */
export const formatDuration = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) {
    return "—";
  }
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
};

/** Format an epoch-millisecond timestamp as a UTC wall clock (`HH:mm:ss.SSS`). */
export const formatClock = (ts: number | null | undefined): string =>
  ts === null || ts === undefined ? "—" : new Date(ts).toISOString().slice(11, 23);

/** Format an epoch-millisecond timestamp as a UTC date and time. */
export const formatDateTime = (ts: number | null | undefined): string =>
  ts === null || ts === undefined
    ? "—"
    : `${new Date(ts).toISOString().slice(0, 10)} ${new Date(ts).toISOString().slice(11, 19)}`;

/** Format a token count. */
export const formatTokens = (tokens: number | null | undefined): string =>
  tokens === null || tokens === undefined ? "—" : String(tokens);

/** Format a USD cost. */
export const formatCost = (cost: number | null | undefined): string =>
  cost === null || cost === undefined ? "—" : `$${cost.toFixed(4)}`;

/** Pick a colorizer for a run/span status. */
export const statusColor = (status: string): ((value: string) => string) => {
  if (status === "error") return color.red;
  if (status === "success") return color.green;
  if (status === "running") return color.yellow;
  return color.gray;
};

/** Pick a colorizer for a log level. */
export const levelColor = (level: string): ((value: string) => string) => {
  if (level === "error" || level === "fatal") return color.red;
  if (level === "warn") return color.yellow;
  if (level === "info") return color.cyan;
  return color.gray;
};

/** Render a table of runs for the terminal. */
export const renderRunsTable = (runs: Run[], limit = 20): string => {
  const header = [
    padEnd("ID", 14),
    padEnd("AGENT", 18),
    padEnd("STATUS", 8),
    padEnd("DURATION", 9),
    padEnd("TOKENS", 7),
    padEnd("COST", 9),
    "STARTED",
  ].join("  ");

  const lines = [color.dim(header)];
  for (const run of runs.slice(0, limit)) {
    lines.push(
      [
        padEnd(truncate(run.id, 14), 14),
        padEnd(truncate(run.agent, 18), 18),
        statusColor(run.status)(padEnd(run.status, 8)),
        padEnd(formatDuration(run.duration), 9),
        padEnd(formatTokens(run.tokens), 7),
        padEnd(formatCost(run.cost), 9),
        formatDateTime(run.startedAt),
      ].join("  "),
    );
  }
  return lines.join("\n");
};

/** Render a full run report for the terminal. */
export const renderRunDetail = (detail: RunDetail): string => {
  const { run, spans, logs, errors, findings } = detail;
  const out: string[] = [];

  out.push(
    `${color.bold(run.agent)}  ${statusColor(run.status)(run.status)}  ${color.gray(run.id)}`,
  );
  out.push(
    color.gray(
      `started ${formatDateTime(run.startedAt)}  duration ${formatDuration(run.duration)}  spans ${spans.length}  tokens ${formatTokens(run.tokens)}  cost ${formatCost(run.cost)}`,
    ),
  );

  out.push("");
  out.push(color.bold("TIMELINE"));
  if (spans.length === 0) {
    out.push(color.gray("  no spans"));
  } else {
    const start = Math.min(run.startedAt, ...spans.map((span) => span.startedAt));
    for (const span of spans) {
      const offset = `+${Math.max(span.startedAt - start, 0)}ms`;
      out.push(
        `  ${color.gray(formatClock(span.startedAt))} ${color.gray(padEnd(offset, 9))}` +
          `${padEnd(span.type.toUpperCase(), 7)} ${padEnd(truncate(span.name, 24), 24)} ` +
          `${padEnd(formatDuration(span.duration), 8)} ${statusColor(span.status)(span.status)}`,
      );
    }
  }

  out.push("");
  out.push(color.bold(`LOGS (${logs.length})`));
  if (logs.length === 0) {
    out.push(color.gray("  no logs"));
  } else {
    for (const entry of logs) {
      out.push(
        `  ${color.gray(formatClock(entry.timestamp))} ${levelColor(entry.level)(padEnd(entry.level.toUpperCase(), 5))} ${entry.message}`,
      );
    }
  }

  out.push("");
  out.push(color.bold(`ERRORS (${errors.length})`));
  if (errors.length === 0) {
    out.push(color.gray("  no errors"));
  } else {
    for (const error of errors) {
      out.push(`  ${color.red(error.type)}: ${error.message}`);
      if (error.stack) {
        const frames = error.stack.split("\n").slice(0, 3);
        out.push(color.gray(frames.map((frame) => `      ${frame}`).join("\n")));
      }
    }
  }

  out.push("");
  out.push(color.bold(`FINDINGS (${findings.length})`));
  if (findings.length === 0) {
    out.push(color.gray("  no findings"));
  } else {
    for (const finding of findings) {
      const severity =
        finding.severity === "critical"
          ? color.red
          : finding.severity === "warning"
            ? color.yellow
            : color.gray;
      out.push(`  ${severity(finding.type)}  ${finding.message}`);
    }
  }

  return out.join("\n");
};
