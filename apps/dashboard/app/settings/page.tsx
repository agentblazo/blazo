import { SettingsView } from "@/components/settings-view";
import { getConfig } from "@/lib/api";
import { defaultConfig } from "@blazo/config";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let config = defaultConfig;

  try {
    config = await getConfig();
  } catch {
    // Fall back to defaults; the client will retry and surface an error.
  }

  return <SettingsView initial={config} />;
}
