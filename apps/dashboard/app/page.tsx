import { RunsView } from "@/components/runs-view";
import { getRuns } from "@/lib/api";
import type { Run } from "@blazo/types";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  let runs: Run[] = [];
  let error: string | null = null;

  try {
    runs = await getRuns();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  return <RunsView initialRuns={runs} initialError={error} />;
}
