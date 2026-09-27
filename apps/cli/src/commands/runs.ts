import { loadConfig } from "@blazo/config";
import { createClient } from "../client";
import { color, renderRunsTable } from "../format";

/** Options accepted by `blazo runs`. */
export interface RunsOptions {
  limit?: number | string;
  json?: boolean;
  collector?: string;
}

/** `blazo runs` — list recent runs. */
export const runsCommand = async (options: RunsOptions): Promise<void> => {
  const config = loadConfig();
  const client = createClient(options.collector ?? config.endpoint);
  const limit = Number(options.limit ?? 50);
  const runs = await client.listRuns(Number.isFinite(limit) ? limit : 50);

  if (options.json) {
    console.log(JSON.stringify(runs, null, 2));
    return;
  }

  if (runs.length === 0) {
    console.log(color.gray("no runs yet"));
    return;
  }

  console.log(renderRunsTable(runs, 50));
};
