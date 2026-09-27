import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { createDatabase, runMigrations } from "./client";
import { runs, spans } from "./schema";

describe("database", () => {
  const database = createDatabase(":memory:");
  runMigrations(database);

  test("inserts and reads a run", () => {
    database.db
      .insert(runs)
      .values({ id: "run-1", agent: "agent-a", status: "running", startedAt: 1000 })
      .run();

    const found = database.db.select().from(runs).where(eq(runs.id, "run-1")).get();
    expect(found?.agent).toBe("agent-a");
    expect(found?.status).toBe("running");
  });

  test("spans reference a run and round-trip metadata", () => {
    database.db
      .insert(spans)
      .values({
        id: "span-1",
        runId: "run-1",
        parentId: null,
        type: "tool",
        name: "tool.search",
        status: "success",
        startedAt: 1100,
        endedAt: 1200,
        duration: 100,
        metadata: { "tool.name": "search" },
      })
      .run();

    const found = database.db.select().from(spans).where(eq(spans.id, "span-1")).get();
    expect(found?.runId).toBe("run-1");
    expect(found?.type).toBe("tool");
    expect(found?.metadata).toEqual({ "tool.name": "search" });
  });
});
