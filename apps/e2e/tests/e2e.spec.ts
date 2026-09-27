import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const findRepoRoot = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(dir, "turbo.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return process.cwd();
};

const repoRoot = findRepoRoot();

test("instrument -> run -> run appears live -> timeline -> error and finding detected", async ({
  page,
}) => {
  await page.goto("/runs");

  // Fresh collector: the list starts empty.
  await expect(page.getByText("No runs yet")).toBeVisible();

  // Instrument and run the example agent.
  const agent = spawnSync("bun", ["examples/basic-agent/src/index.ts"], {
    cwd: repoRoot,
    env: { ...process.env, BLAZO_ENDPOINT: "http://127.0.0.1:4319" },
    encoding: "utf8",
    timeout: 30_000,
  });
  expect(agent.status).toBe(0);

  // The run appears in the list without a manual reload.
  const runLink = page.getByRole("link", { name: /research-agent/ }).first();
  await expect(runLink).toBeVisible({ timeout: 20_000 });

  // Open the run detail page.
  await runLink.click();
  await expect(page.getByRole("heading", { name: "research-agent" })).toBeVisible();

  // Timeline step present (each tool call is a timeline button).
  await expect(page.getByRole("button", { name: /tool\.fetch/ }).first()).toBeVisible();

  // The raised error is visible.
  await expect(page.getByText(/upstream 503/).first()).toBeVisible();

  // A finding was detected and surfaced.
  await expect(page.getByText(/possible_loop|repeated_tool|repeated_error/).first()).toBeVisible();
});
