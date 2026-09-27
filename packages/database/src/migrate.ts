import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createDatabase, runMigrations } from "./client";

const path = process.env.BLAZO_DB_PATH ?? ".blazo/blazo.db";
mkdirSync(dirname(path), { recursive: true });

const database = createDatabase(path);
runMigrations(database);
database.sqlite.close();

console.log(`Migrated Blazo database at ${path}`);
