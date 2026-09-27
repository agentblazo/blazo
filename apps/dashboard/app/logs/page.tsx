import { LogsView } from "@/components/logs-view";
import { getLogs } from "@/lib/api";
import type { Log } from "@blazo/types";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  let logs: Log[] = [];

  try {
    logs = await getLogs();
  } catch {
    logs = [];
  }

  return <LogsView initialLogs={logs} />;
}
