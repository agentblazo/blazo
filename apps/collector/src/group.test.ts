import { describe, expect, test } from "bun:test";
import type { BlazoError } from "@blazo/types";
import { groupErrors } from "./group";

const error = (id: string, runId: string, message: string, timestamp: number): BlazoError => ({
  id,
  runId,
  spanId: null,
  type: "Error",
  message,
  stack: null,
  agent: "agent",
  timestamp,
});

describe("groupErrors", () => {
  test("groups identical errors by signature and counts them", () => {
    const groups = groupErrors([
      error("1", "r1", "503", 1),
      error("2", "r1", "503", 2),
      error("3", "r2", "503", 3),
      error("4", "r1", "timeout", 4),
    ]);

    expect(groups).toHaveLength(2);

    const top = groups[0];
    expect(top?.message).toBe("503");
    expect(top?.count).toBe(3);
    expect(top?.runIds).toEqual(["r1", "r2"]);
    expect(top?.firstAt).toBe(1);
    expect(top?.lastAt).toBe(3);
  });

  test("returns an empty array for no errors", () => {
    expect(groupErrors([])).toEqual([]);
  });
});
