import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import bcryptjs from "bcryptjs";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
const checkOnly = process.argv.includes("--check");

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const client = new Client({ connectionString });
await client.connect();

try {
  const result = await client.query(`SELECT COUNT(*)::integer AS "count" FROM "users"`);
  const accountCount = Number(result.rows[0]?.count ?? 0);

  if (checkOnly) {
    console.log(accountCount === 0 ? "NO_USERS" : `USERS_EXIST:${accountCount}`);
  } else if (accountCount > 0) {
    console.log(`Existing accounts preserved (${accountCount}).`);
  } else {
    const password =
      process.env.SEED_PASSWORD ||
      (await readFile(0, "utf8").catch(() => "")).replace(/\r?\n$/, "");

    if (password.length < 12) {
      throw new Error("The initial administrator password must contain at least 12 characters.");
    }

    const email = (process.env.ADMIN_EMAIL || "admin@contracthub.local").trim().toLowerCase();
    const passwordHash = await bcryptjs.hash(password, 12);
    const adminId = `c${randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const auditId = `c${randomUUID().replaceAll("-", "").slice(0, 24)}`;

    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO "users"
          ("id", "name", "email", "password_hash", "role", "is_active", "created_at", "updated_at")
         VALUES ($1, $2, $3, $4, 'ADMIN', true, now(), now())`,
        [adminId, "مسؤول النظام", email, passwordHash],
      );
      await client.query(
        `INSERT INTO "system_settings" ("id", "created_at", "updated_at")
         VALUES ('default', now(), now())
         ON CONFLICT ("id") DO NOTHING`,
      );
      await client.query(
        `INSERT INTO "audit_logs"
          ("id", "user_id", "action", "entity_type", "entity_id", "details", "created_at")
         VALUES ($1, $2, 'INITIAL_ADMIN_CREATED', 'System', 'default', $3::jsonb, now())`,
        [auditId, adminId, JSON.stringify({ email })],
      );
      await client.query("COMMIT");
      console.log(`Initial administrator created: ${email}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
