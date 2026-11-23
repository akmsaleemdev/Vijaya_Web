import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

const durableTables = [
  "Space", "SlotState", "Booking", "Payment", "Lead", "Document", "Milestone", "SupportTicket", "AnalyticsEvent",
  "AuditLog", "AdminUser", "ContentEntry", "ContentVersion", "MediaAsset", "CustomerNote", "BookingNote", "EmailLog", "SessionConfig",
] as const;

type Column = { column_name: string; data_type: string };
type SQLiteValue = string | number | bigint | Uint8Array | null;
type Row = Record<string, SQLiteValue>;

function normalized(value: SQLiteValue, type: string) {
  if (value === null) return null;
  if (type === "jsonb" && typeof value === "string") return JSON.parse(value);
  if (type === "boolean") {
    if (value !== 0 && value !== 1 && value !== BigInt(0) && value !== BigInt(1)) throw new Error("Invalid legacy boolean.");
    return value === 1 || value === BigInt(1);
  }
  if (type.startsWith("timestamp")) {
    let date: Date;
    if (typeof value === "string" && !/^\d+$/.test(value)) {
      const stamp = value.replace(/ UTC$/, "Z").replace(" ", "T");
      date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(stamp) ? stamp : stamp + "Z");
    } else {
      date = new Date(Number(value));
    }
    return date.toISOString();
  }
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) throw new Error("Unexpected binary column.");
  return value;
}

async function importDatabase() {
  const filename = process.argv[2];
  if (!filename) throw new Error("Usage: npm run db:import-sqlite -- /path/to/backup.db");
  loadEnvConfig(process.cwd());
  const url = process.env.DIRECT_URL;
  if (!url || new URL(url).searchParams.get("schema") !== "vijaya") {
    throw new Error("Use a direct or session-pooler DIRECT_URL with schema=vijaya.");
  }
  const sqlite = new DatabaseSync(resolve(filename), { readOnly: true });
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });
  const client = await pool.connect();
  try {
    const integrity = sqlite.prepare("PRAGMA quick_check").get()?.quick_check;
    if (integrity !== "ok") throw new Error("SQLite integrity check failed.");
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL search_path TO vijaya, extensions, public");
      await client.query("SELECT pg_advisory_xact_lock($1, $2)", [20261123, 1]);
      const rowsCopied: Record<string, { source: number; inserted: number }> = {};
      for (const table of durableTables) {
        const { rows: [populated] } = await client.query<{ populated: boolean }>(
          `SELECT EXISTS (SELECT 1 FROM vijaya."${table}") AS populated`,
        );
        if (populated?.populated) throw new Error(`Target table ${table} is populated. Use an empty database before seeding.`);
        const present = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
        if (!present) continue;
        const { rows: columns } = await client.query<Column>(
          `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='vijaya' AND table_name=$1`,
          [table],
        );
        const known = new Map(columns.map(({ column_name, data_type }) => [column_name, data_type]));
        const statement = sqlite.prepare(`SELECT * FROM "${table}"`);
        let batch: Record<string, unknown>[] = [];
        let total = 0;
        async function flush() {
          if (!batch.length) return;
          const names = Object.keys(batch[0]);
          const fields = names.map((field) => `"${field.replaceAll('"', '""')}"`).join(",");
          const target = `vijaya."${table}"`;
          const result = await client.query(
            `INSERT INTO ${target} (${fields}) SELECT ${fields} FROM json_populate_recordset(NULL::${target}, $1::json)`,
            [JSON.stringify(batch)],
          );
          total += result.rowCount ?? 0;
          batch = [];
        }
        for (const raw of statement.iterate()) {
          const row = raw as Row;
          const mapped: Record<string, unknown> = {};
          for (const [field, value] of Object.entries(row)) {
            const type = known.get(field);
            if (type) mapped[field] = table === "Booking" && field === "status" && value === "HOLD" ? "PENDING_HOLD" : normalized(value, type);
          }
          batch.push(mapped);
          if (batch.length === 250) await flush();
        }
        await flush();
        const source = Number(sqlite.prepare(`SELECT COUNT(*) AS total FROM "${table}"`).get()?.total);
        if (source !== total) throw new Error(`Row count mismatch for ${table}.`);
        rowsCopied[table] = { source, inserted: total };
      }
      await client.query("COMMIT");
      console.table(rowsCopied);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    sqlite.close();
    client.release();
    await pool.end();
  }
}

void importDatabase().catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
  console.error("SQLite import failed:", error instanceof Error ? error.message : "unknown error", code ? `(PostgreSQL ${code})` : "");
  process.exitCode = 1;
});
