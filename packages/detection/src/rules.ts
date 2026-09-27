import type { Finding, FindingSeverity, FindingType } from "@blazo/types";
import type { DetectionInput, FindingThresholds } from "./types";

/** A rule inspects a run snapshot and returns zero or more findings. */
export type DetectionRule = (input: DetectionInput, thresholds: FindingThresholds) => Finding[];

const formatDuration = (ms: number): string =>
  ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;

/** Small deterministic hash used to build stable finding ids. */
const hash = (value: string): string => {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) {
    h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
};

const makeFinding = (
  runId: string,
  type: FindingType,
  severity: FindingSeverity,
  message: string,
  createdAt: number,
  suffix = "",
): Finding => ({
  id: `${runId}:${type}${suffix}`,
  runId,
  type,
  severity,
  message,
  createdAt,
});

/** `long_running` — duration (or elapsed time) exceeds the threshold. */
export const longRunningRule: DetectionRule = (input, thresholds) => {
  const { run, now } = input;
  const duration = run.duration ?? (run.status === "running" ? now - run.startedAt : null);

  if (duration === null || duration <= thresholds.longRunningMs) {
    return [];
  }

  const severity: FindingSeverity =
    duration >= thresholds.longRunningMs * 2 ? "critical" : "warning";
  const message =
    run.status === "running"
      ? `Run has been running for ${formatDuration(duration)} (threshold ${formatDuration(thresholds.longRunningMs)})`
      : `Run duration ${formatDuration(duration)} exceeded threshold ${formatDuration(thresholds.longRunningMs)}`;

  return [makeFinding(run.id, "long_running", severity, message, now)];
};

/** `repeated_tool` — the same tool is called more than the threshold. */
export const repeatedToolRule: DetectionRule = (input, thresholds) => {
  const counts = new Map<string, number>();
  for (const span of input.spans) {
    if (span.type === "tool") {
      counts.set(span.name, (counts.get(span.name) ?? 0) + 1);
    }
  }

  const findings: Finding[] = [];
  const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const count = counts.get(name) ?? 0;
    if (count < thresholds.repeatedToolCount) {
      continue;
    }
    const severity: FindingSeverity =
      count >= thresholds.repeatedToolCount * 2 ? "critical" : "warning";
    findings.push(
      makeFinding(
        input.run.id,
        "repeated_tool",
        severity,
        `Tool "${name}" called ${count} times`,
        input.now,
        `:${name}`,
      ),
    );
  }
  return findings;
};

/** `repeated_error` — the same error message raised more than the threshold. */
export const repeatedErrorRule: DetectionRule = (input, thresholds) => {
  const counts = new Map<string, number>();
  for (const error of input.errors) {
    const signature = `${error.type}: ${error.message}`;
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  }

  const findings: Finding[] = [];
  const signatures = [...counts.keys()].sort((a, b) => a.localeCompare(b));
  for (const signature of signatures) {
    const count = counts.get(signature) ?? 0;
    if (count < thresholds.repeatedErrorCount) {
      continue;
    }
    findings.push(
      makeFinding(
        input.run.id,
        "repeated_error",
        "critical",
        `Error "${signature}" occurred ${count} times`,
        input.now,
        `:${hash(signature)}`,
      ),
    );
  }
  return findings;
};

/** `no_activity` — a running run has been silent for longer than the threshold. */
export const noActivityRule: DetectionRule = (input, thresholds) => {
  const { run, now } = input;
  if (run.status !== "running") {
    return [];
  }

  let last = run.startedAt;
  for (const span of input.spans) {
    last = Math.max(last, span.endedAt ?? span.startedAt);
  }
  for (const entry of input.logs) {
    last = Math.max(last, entry.timestamp);
  }

  const idle = now - last;
  if (idle <= thresholds.noActivityMs) {
    return [];
  }

  return [
    makeFinding(
      run.id,
      "no_activity",
      "warning",
      `No activity for ${formatDuration(idle)} (threshold ${formatDuration(thresholds.noActivityMs)})`,
      now,
    ),
  ];
};

/** `possible_loop` — consecutive repeats or a repeating tool pattern. */
export const possibleLoopRule: DetectionRule = (input, thresholds) => {
  const names = input.spans
    .filter((span) => span.type === "tool")
    .slice()
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((span) => span.name);

  const findings: Finding[] = [];

  for (let i = 0; i < names.length; ) {
    const name = names[i] ?? "";
    let end = i + 1;
    while (end < names.length && names[end] === name) {
      end += 1;
    }
    const length = end - i;
    if (length >= thresholds.loopRepeatCount) {
      findings.push(
        makeFinding(
          input.run.id,
          "possible_loop",
          "critical",
          `Possible loop: "${name}" called ${length} times in a row`,
          input.now,
          `:repeat:${name}`,
        ),
      );
    }
    i = end;
  }

  for (let block = 2; block <= 3; block += 1) {
    if (names.length < block * 2) {
      continue;
    }
    const start = names.length - block * 2;
    const blockNames: string[] = [];
    let repeated = true;
    for (let k = 0; k < block; k += 1) {
      const left = names[start + k];
      const right = names[start + block + k];
      blockNames.push(left ?? "");
      if (left !== right) {
        repeated = false;
      }
    }
    // Only report multi-tool cycles; single-tool repeats are handled above.
    if (repeated && new Set(blockNames).size >= 2) {
      findings.push(
        makeFinding(
          input.run.id,
          "possible_loop",
          "critical",
          `Possible loop: pattern [${blockNames.join(", ")}] repeated`,
          input.now,
          `:pattern:${hash(blockNames.join(","))}`,
        ),
      );
    }
  }

  return findings;
};

/** Every rule, in application order. */
export const DETECTION_RULES: DetectionRule[] = [
  longRunningRule,
  repeatedToolRule,
  repeatedErrorRule,
  noActivityRule,
  possibleLoopRule,
];
