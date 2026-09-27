import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

/** A Drizzle client bound to a Bun SQLite connection. */
export type BlazoDatabase = ReturnType<typeof drizzle<typeof schema>>;

/** An open database handle together with its raw SQLite connection. */
export interface BlazoDb {
  db: BlazoDatabase;
  sqlite: Database;
}

/** Open a SQLite database in WAL mode with foreign keys enabled. */
export const createDatabase = (path: string): BlazoDb => {
  const sqlite = new Database(path, { create: true });
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec("PRAGMA busy_timeout = 5000;");
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
};

/** Apply all pending Drizzle migrations from the package's `migrations/`. */
export const runMigrations = (database: BlazoDb): void => {
  migrate(database.db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
};
