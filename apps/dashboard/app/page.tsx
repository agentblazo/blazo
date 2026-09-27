import { OverviewView } from "@/components/overview-view";
import { getOverview } from "@/lib/api";
import type { Overview } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let overview: Overview = {
    metrics: {
      runs: { total: 0, running: 0, success: 0, error: 0, successRate: null },
      duration: { avg: null, max: null },
      tokens: { total: null, avg: null },
      cost: { total: null },
      calls: { llm: 0, tool: 0 },
      errors: { total: 0 },
      findings: { total: 0, critical: 0, warning: 0 },
    },
    recentRuns: [],
    activeRuns: [],
    slowRuns: [],
    recentFindings: [],
    topErrors: [],
  };

  try {
    overview = await getOverview();
  } catch {
    // Keep the empty fallback; the client will retry and surface an error.
  }

  return <OverviewView initial={overview} />;
}
