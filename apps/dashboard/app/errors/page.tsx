import { ErrorsView } from "@/components/errors-view";
import { getErrorGroups } from "@/lib/api";
import type { ErrorGroup } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ErrorsPage() {
  let groups: ErrorGroup[] = [];

  try {
    groups = await getErrorGroups();
  } catch {
    groups = [];
  }

  return <ErrorsView initialGroups={groups} />;
}
