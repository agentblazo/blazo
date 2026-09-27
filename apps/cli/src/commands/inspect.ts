import { loadConfig } from "@blazo/config";
import { createClient } from "../client";
import { color, renderRunDetail } from "../format";

/** Options accepted by `blazo inspect`. */
export interface InspectOptions {
  json?: boolean;
  collector?: string;
}

/** `blazo inspect <run-id>` — print a full run report. */
export const inspectCommand = async (runId: string, options: InspectOptions): Promise<void> => {
  const config = loadConfig();
  const client = createClient(options.collector ?? config.endpoint);
  const detail = await client.getRun(runId);

  if (!detail) {
    console.error(color.red(`run not found: ${runId}`));
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(detail, null, 2));
    return;
  }

  console.log(renderRunDetail(detail));
};
