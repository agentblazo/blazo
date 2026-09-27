import { existsSync } from "node:fs";
import { defaultConfig, getConfigPath, writeConfig } from "@blazo/config";
import { color } from "../format";

/** `blazo init` — write a default `blazo.config.json` if one does not exist. */
export const initCommand = (): void => {
  const path = getConfigPath();

  if (existsSync(path)) {
    console.log(color.yellow(`config already exists: ${path}`));
    return;
  }

  writeConfig(defaultConfig);
  console.log(`${color.green("created")} ${path}`);
};
