import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Pool, type PoolClient } from "pg";

loadEnvConfig(process.cwd());

const schema = "vijaya";
const baselineVersions = [
  "202611230003_postgres_baseline",
  "202611230004_native_live_cms",
];
const requiredTables = [
  "Space", "SlotState", "Booking", "Payment", "Lead", "Document", "Milestone",
  "SupportTicket", "AnalyticsEvent", "AuditLog", "AdminUser", "LoginAttempt",
  "ContentEntry", "ContentVersion", "MediaAsset", "CustomerNote", "BookingNote",
  "EmailLog", "SessionConfig", "AdminSession", "PaymentSettings", "GatewayCredential",
];

async function tableState(client: PoolClient) {
  const { rows } = await client.query<{ table_name: string; present: boolean }>(
    `SELECT item AS table_name, to_regclass(format('vijaya.%I', item)) IS NOT NULL AS present
     FROM unnest($1::text[]) AS tables(item)`,
    [requiredTables],
  );
  return {
    present: rows.filter((row) => row.present).length,
    total: requiredTables.length,
  };
}

async function existingSchemaIsComplete(client: PoolClient) {
  const tables = await tableState(client);
  if (tables.present === 0) return false;
  if (tables.present !== tables.total) {
    throw new Error(`Found a partial ${schema} schema (${tables.present}/${tables.total} tables). Refusing to modify it automatically.`);
  }
  const [types, constraints, expireFunction, boundaryFunction] = await Promise.all([
    client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'vijaya' AND t.typname = ANY($1::text[])`,
      [["BookingStatus", "SlotStatus", "PaymentStatus"]],
    ),
    client.query<{ count: number }>(
      `SELECT count(DISTINCT conname)::int AS count FROM pg_constraint
       WHERE connamespace = 'vijaya'::regnamespace
       AND conname = ANY($1::text[])`,
      [["SlotState_no_overlap", "Booking_no_overlap"]],
    ),
    client.query<{ present: boolean }>(`SELECT to_regprocedure('vijaya.expire_holds()') IS NOT NULL AS present`),
    client.query<{ present: boolean }>(`SELECT to_regprocedure('vijaya.slot_boundary(text,integer)') IS NOT NULL AS present`),
  ]);
  return types.rows[0]?.count === 3 &&
    constraints.rows[0]?.count === 2 &&
    expireFunction.rows[0]?.present === true &&
    boundaryFunction.rows[0]?.present === true;
}

async function withTransaction<T>(client: PoolClient, work: () => Promise<T>) {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL search_path TO vijaya, extensions, public");
    const result = await work();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DIRECT_URL or DATABASE_URL before running SQL migrations.");
  const url = new URL(connectionString);
  if (url.searchParams.get("schema") !== schema) throw new Error("The migration connection must include schema=vijaya.");
  if (url.port === "6543") throw new Error("Use the Supabase session pooler on port 5432 for DDL migrations.");

  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
  const client = await pool.connect();
  try {
    await client.query("CREATE SCHEMA IF NOT EXISTS vijaya");
    await client.query(
      `CREATE TABLE IF NOT EXISTS vijaya."_app_migrations" (
        "version" text PRIMARY KEY,
        "appliedAt" timestamptz NOT NULL DEFAULT now()
      )`,
    );

    const migrationDirectory = path.join(process.cwd(), "supabase", "migrations");
    const files = (await readdir(migrationDirectory))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const appliedResult = await client.query<{ version: string }>(`SELECT "version" FROM vijaya."_app_migrations"`);
    const applied = new Set(appliedResult.rows.map((row) => row.version));

    if (applied.size === 0) {
      const state = await tableState(client);
      if (state.present > 0) {
        if (!(await existingSchemaIsComplete(client))) {
          throw new Error("Existing vijaya tables do not match the complete SQL baseline. No migrations were applied.");
        }
        for (const version of baselineVersions) {
          await client.query(
            `INSERT INTO vijaya."_app_migrations" ("version") VALUES ($1) ON CONFLICT DO NOTHING`,
            [version],
          );
          applied.add(version);
        }
        console.log("Adopted the existing vijaya schema; application data was left unchanged.");
      }
    }

    for (const file of files) {
      const version = path.basename(file, ".sql");
      if (applied.has(version)) continue;
      const sql = await readFile(path.join(migrationDirectory, file), "utf8");
      await withTransaction(client, async () => {
        await client.query(sql);
        await client.query(
          `INSERT INTO vijaya."_app_migrations" ("version") VALUES ($1)`,
          [version],
        );
      });
      console.log(`Applied ${version}.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("SQL migration failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
