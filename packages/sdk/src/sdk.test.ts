import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SpanStatusCode } from "@opentelemetry/api";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { InMemoryLogRecordExporter } from "@opentelemetry/sdk-logs";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-node";
import { configure, log, observe, shutdown, span } from "./index";

const traceExporter = new InMemorySpanExporter();
const logExporter = new InMemoryLogRecordExporter();

beforeAll(() => {
  configure({ traceExporter, logExporter });
});

afterAll(async () => {
  await shutdown();
});

describe("observe", () => {
  test("returns the result and records a root span", async () => {
    traceExporter.reset();
    const result = await observe("agent-x", async () => 42);
    expect(result).toBe(42);

    const root = traceExporter.getFinishedSpans().find((s) => s.name === "agent-x");
    expect(root).toBeDefined();
    expect(root?.attributes["blazo.agent"]).toBe("agent-x");
    expect(root?.attributes["blazo.run"]).toBe(true);
    expect(root?.status.code).toBe(SpanStatusCode.OK);
  });

  test("marks the span errored and rethrows", async () => {
    traceExporter.reset();
    await expect(
      observe("agent-fail", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const root = traceExporter.getFinishedSpans().find((s) => s.name === "agent-fail");
    expect(root?.status.code).toBe(SpanStatusCode.ERROR);
  });
});

describe("span", () => {
  test("records a child span with its type", async () => {
    traceExporter.reset();
    await observe("agent-y", async () => {
      await span("tool.search", async () => "ok", { type: "tool" });
    });

    const spans = traceExporter.getFinishedSpans();
    const child = spans.find((s) => s.name === "tool.search");

    expect(child).toBeDefined();
    expect(child?.attributes["blazo.type"]).toBe("tool");
    expect(child?.status.code).toBe(SpanStatusCode.OK);
    // Parent/child linkage is validated end-to-end (collector + dashboard timeline).
  });
});

describe("log", () => {
  test("emits a log record with the given level and message", async () => {
    logExporter.reset();
    await observe("agent-z", async () => {
      log("warn", "watch out", { code: 7 });
    });

    const record = logExporter.getFinishedLogRecords().find((r) => r.body === "watch out");
    expect(record).toBeDefined();
    expect(record?.severityNumber).toBe(SeverityNumber.WARN);
    expect(record?.attributes.code).toBe(7);
  });
});
