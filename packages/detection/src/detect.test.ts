import { describe, expect, test } from "bun:test";
import type { BlazoError, Log, Run, Span } from "@blazo/types";
import { detectFindings } from "./detect";
import type { DetectionInput, FindingThresholds } from "./types";

const THRESHOLDS: FindingThresholds = {
  longRunningMs: 30_000,
  repeatedToolCount: 3,
  repeatedErrorCount: 3,
  noActivityMs: 30_000,
  loopRepeatCount: 4,
};

const run = (overrides: Partial<Run> = {}): Run => ({
  id: "run-1",
  agent: "agent",
  status: "success",
  startedAt: 0,
  endedAt: 1_000,
  duration: 1_000,
  tokens: null,
  cost: null,
  ...overrides,
});

let spanSeq = 0;
const nextSpanId = (): string => {
  spanSeq += 1;
  return `span-${spanSeq}`;
};
const span = (overrides: Partial<Span> = {}): Span => ({
  id: nextSpanId(),
  runId: "run-1",
  parentId: null,
  type: "tool",
  name: "tool",
  status: "success",
  startedAt: 0,
  endedAt: 100,
  duration: 100,
  metadata: {},
  ...overrides,
});

const log = (overrides: Partial<Log> = {}): Log => ({
  id: "log-1",
  runId: "run-1",
  spanId: null,
  timestamp: 0,
  level: "info",
  message: "hello",
  metadata: {},
  ...overrides,
});

const error = (overrides: Partial<BlazoError> = {}): BlazoError => ({
  id: "err-1",
  runId: "run-1",
  spanId: null,
  type: "Error",
  message: "boom",
  stack: null,
  agent: "agent",
  timestamp: 0,
  ...overrides,
});

const input = (overrides: Partial<DetectionInput> = {}): DetectionInput => ({
  run: run(),
  spans: [],
  logs: [],
  errors: [],
  now: 10_000,
  ...overrides,
});

describe("long_running", () => {
  test("flags a completed run over the threshold", () => {
    const findings = detectFindings(input({ run: run({ duration: 40_000 }) }), THRESHOLDS);
    expect(findings.map((f) => f.type)).toContain("long_running");
    expect(findings[0]?.severity).toBe("warning");
  });

  test("escalates to critical past twice the threshold", () => {
    const findings = detectFindings(input({ run: run({ duration: 61_000 }) }), THRESHOLDS);
    expect(findings[0]?.severity).toBe("critical");
  });

  test("uses elapsed time for a running run", () => {
    const findings = detectFindings(
      input({
        run: run({ status: "running", endedAt: null, duration: null, startedAt: 0 }),
        now: 40_000,
      }),
      THRESHOLDS,
    );
    expect(findings.map((f) => f.type)).toContain("long_running");
  });

  test("stays quiet under the threshold", () => {
    expect(detectFindings(input({ run: run({ duration: 10_000 }) }), THRESHOLDS)).toHaveLength(0);
  });
});

describe("repeated_tool", () => {
  test("flags a tool called at/over the threshold", () => {
    const spans = [span({ name: "search" }), span({ name: "search" }), span({ name: "search" })];
    const findings = detectFindings(input({ spans }), THRESHOLDS);
    expect(findings.map((f) => f.type)).toContain("repeated_tool");
    expect(findings[0]?.message).toContain("3 times");
  });

  test("escalates at twice the threshold", () => {
    const spans = Array.from({ length: 6 }, () => span({ name: "search" }));
    const findings = detectFindings(input({ spans }), THRESHOLDS);
    expect(findings[0]?.severity).toBe("critical");
  });
});

describe("repeated_error", () => {
  test("flags the same error three times as critical", () => {
    const errors = [
      error({ message: "503" }),
      error({ message: "503" }),
      error({ message: "503" }),
    ];
    const findings = detectFindings(input({ errors }), THRESHOLDS);
    const repeated = findings.find((f) => f.type === "repeated_error");
    expect(repeated?.severity).toBe("critical");
    expect(repeated?.message).toContain("3 times");
  });

  test("ignores distinct errors", () => {
    const errors = [error({ message: "a" }), error({ message: "b" }), error({ message: "c" })];
    expect(detectFindings(input({ errors }), THRESHOLDS)).toHaveLength(0);
  });
});

describe("no_activity", () => {
  test("flags an idle running run", () => {
    const findings = detectFindings(
      input({
        run: run({ status: "running", endedAt: null, duration: null, startedAt: 0 }),
        logs: [log({ timestamp: 5_000 })],
        now: 50_000,
      }),
      THRESHOLDS,
    );
    expect(findings.map((f) => f.type)).toContain("no_activity");
  });

  test("does not flag completed runs", () => {
    expect(detectFindings(input({ run: run() }), THRESHOLDS)).toHaveLength(0);
  });
});

describe("possible_loop", () => {
  test("flags four identical tool calls in a row", () => {
    const spans = Array.from({ length: 4 }, () => span({ name: "search" }));
    const findings = detectFindings(input({ spans }), THRESHOLDS);
    expect(findings.map((f) => f.type)).toContain("possible_loop");
  });

  test("flags a repeating two-tool pattern", () => {
    const spans = [
      span({ name: "a", startedAt: 0 }),
      span({ name: "b", startedAt: 1 }),
      span({ name: "a", startedAt: 2 }),
      span({ name: "b", startedAt: 3 }),
    ];
    const findings = detectFindings(input({ spans }), THRESHOLDS);
    const loop = findings.find((f) => f.type === "possible_loop");
    expect(loop?.message).toContain("[a, b]");
  });

  test("finder ids are stable across passes", () => {
    const spans = Array.from({ length: 4 }, () => span({ name: "search" }));
    const first = detectFindings(input({ spans }), THRESHOLDS).map((f) => f.id);
    const second = detectFindings(input({ spans }), THRESHOLDS).map((f) => f.id);
    expect(first.sort()).toEqual(second.sort());
  });
});
