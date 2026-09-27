import { RunsView } from "@/components/runs-view";
import { getRuns } from "@/lib/api";
import type { Run } from "@blazo/types";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  let runs: Run[] = [];

  try {
    runs = await getRuns();
  } catch {
    runs = [];
  }

  return <RunsView initialRuns={runs} />;
}
