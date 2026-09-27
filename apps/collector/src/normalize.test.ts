import { describe, expect, test } from "bun:test";
import { normalizeLogs, normalizeTraces } from "./normalize";
import type { ExportLogsServiceRequest, ExportTraceServiceRequest } from "./otlp";

describe("normalizeTraces", () => {
  test("derives a run from a root span and events from children", () => {
    const payload: ExportTraceServiceRequest = {
      resourceSpans: [
        {
          resource: { attributes: [{ key: "service.name", value: { stringValue: "agent-a" } }] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: "trace-1",
                  spanId: "root",
                  name: "agent-a",
                  startTimeUnixNano: "1000000000",
                  endTimeUnixNano: "1200000000",
                  attributes: [{ key: "blazo.agent", value: { stringValue: "agent-a" } }],
                },
                {
                  traceId: "trace-1",
                  spanId: "child",
                  parentSpanId: "root",
                  name: "tool.x",
                  startTimeUnixNano: "1010000000",
                  endTimeUnixNano: "1100000000",
                  attributes: [{ key: "blazo.type", value: { stringValue: "tool" } }],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeTraces(payload);

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]?.id).toBe("trace-1");
    expect(result.runs[0]?.agent).toBe("agent-a");
    expect(result.spans).toHaveLength(2);

    const child = result.spans.find((s) => s.id === "child");
    expect(child?.parentId).toBe("root");
    expect(child?.type).toBe("tool");
    expect(child?.runId).toBe("trace-1");
  });

  test("flags a run as errored when a span has an error status", () => {
    const payload: ExportTraceServiceRequest = {
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: "trace-2",
                  spanId: "root",
                  name: "a",
                  startTimeUnixNano: "1000000000",
                  endTimeUnixNano: "1100000000",
                  status: { code: 2, message: "boom" },
                },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeTraces(payload);
    expect(result.runs[0]?.status).toBe("error");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe("boom");
  });

  test("creates placeholder runs for orphaned spans", () => {
    const payload: ExportTraceServiceRequest = {
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: "trace-3",
                  spanId: "orphan",
                  name: "tool.y",
                  startTimeUnixNano: "1000000000",
                  endTimeUnixNano: "1100000000",
                },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeTraces(payload);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]?.agent).toBe("unknown-agent");
  });
});

describe("normalizeLogs", () => {
  test("normalizes log records and their levels", () => {
    const payload: ExportLogsServiceRequest = {
      resourceLogs: [
        {
          resource: { attributes: [{ key: "service.name", value: { stringValue: "agent-a" } }] },
          scopeLogs: [
            {
              logRecords: [
                {
                  traceId: "trace-4",
                  spanId: "root",
                  timeUnixNano: "2000000000",
                  severityText: "WARN",
                  severityNumber: 13,
                  body: { stringValue: "careful" },
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeLogs(payload);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]?.runId).toBe("trace-4");
    expect(result.logs[0]?.level).toBe("warn");
    expect(result.logs[0]?.message).toBe("careful");
    expect(result.runs[0]?.status).toBe("running");
  });
});
