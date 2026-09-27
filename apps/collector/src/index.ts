import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadConfig } from "@blazo/config";
import { createDatabase, runMigrations } from "@blazo/database";
import { createApp } from "./app";
import { createDetector } from "./detector";
import { createEventHub } from "./events";
import { createRepository } from "./repository";

const config = loadConfig();
const databasePath = resolve(process.env.BLAZO_DB_PATH ?? config.database.path);

mkdirSync(dirname(databasePath), { recursive: true });

const database = createDatabase(databasePath);
runMigrations(database);

const hub = createEventHub();
const repository = createRepository(database, hub);
const detector = createDetector(repository, config.detection);
const app = createApp(repository, hub, detector);

const sweepMs = Number(process.env.BLAZO_SWEEP_MS ?? "5000");
const sweep = setInterval(() => detector.sweep(), sweepMs);
sweep.unref?.();

const server = Bun.serve({
  hostname: config.collector.host,
  port: config.collector.port,
  fetch: app.fetch,
});

console.log(
  `Blazo collector listening on http://${server.hostname}:${server.port} (db: ${databasePath})`,
);
