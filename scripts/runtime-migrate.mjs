import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const client = new Client({ connectionString });
const migrationsRoot = new URL("./prisma/migrations/", import.meta.url);

await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  const entries = await readdir(migrationsRoot, { withFileTypes: true });
  const migrations = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migrationName of migrations) {
    const existing = await client.query(
      `SELECT "finished_at", "rolled_back_at"
         FROM "_prisma_migrations"
        WHERE "migration_name" = $1
        ORDER BY "started_at" DESC
        LIMIT 1`,
      [migrationName],
    );

    if (existing.rows[0]?.finished_at && !existing.rows[0]?.rolled_back_at) {
      console.log(`Migration already applied: ${migrationName}`);
      continue;
    }

    if (existing.rowCount) {
      throw new Error(
        `Migration ${migrationName} has an unfinished or rolled-back history entry. ` +
          "Back up the database and repair the migration state before continuing.",
      );
    }

    const sqlPath = join(migrationsRoot.pathname, migrationName, "migration.sql");
    const sql = await readFile(sqlPath, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const id = randomUUID();

    console.log(`Applying migration: ${migrationName}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
          ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
         VALUES ($1, $2, now(), $3, now(), 1)`,
        [id, checksum, migrationName],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log("Database migrations are current.");
} finally {
  await client.end();
}
