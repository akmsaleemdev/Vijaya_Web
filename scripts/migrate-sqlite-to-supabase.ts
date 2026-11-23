import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadEnvConfig } from "@next/env";
import { Prisma, PrismaClient } from "@prisma/client";

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
  const pg = new PrismaClient({ datasourceUrl: url });
  try {
    const integrity = sqlite.prepare("PRAGMA quick_check").get()?.quick_check;
    if (integrity !== "ok") throw new Error("SQLite integrity check failed.");
    const counts = await pg.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261123, 1) IS NULL AS locked`;
      const rowsCopied: Record<string, { source: number; inserted: number }> = {};
      for (const table of durableTables) {
        const target = Prisma.raw(`"vijaya"."${table}"`);
        const populated = await tx.$queryRaw<{ populated: boolean }[]>`SELECT EXISTS (SELECT 1 FROM ${target}) AS populated`;
        if (populated[0]?.populated) throw new Error(`Target table ${table} is populated. Use an empty database before seeding.`);
        const present = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
        if (!present) continue;
        const columns = await tx.$queryRaw<Column[]>`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='vijaya' AND table_name=${table}`;
        const known = new Map(columns.map(({ column_name, data_type }) => [column_name, data_type]));
        const statement = sqlite.prepare(`SELECT * FROM "${table}"`);
        let batch: Record<string, unknown>[] = [];
        let total = 0;
        async function flush() {
          if (!batch.length) return;
          const fields = Prisma.join(Object.keys(batch[0]).map((field) => Prisma.raw('"' + field.replaceAll('"', '""') + '"')));
          total += await tx.$executeRaw`INSERT INTO ${target} (${fields}) SELECT ${fields} FROM json_populate_recordset(NULL::${target}, ${JSON.stringify(batch)}::json)`;
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
      return rowsCopied;
    }, { timeout: 600_000, maxWait: 30_000 });
    console.table(counts);
  } finally {
    sqlite.close();
    await pg.$disconnect();
  }
}

void importDatabase().catch((error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`Import rolled back (Prisma ${error.code}, database ${error.meta?.code ?? "unknown"}). Check legacy data for duplicate keys or overlapping reservations.`);
  } else {
    console.error(error instanceof Error ? error.message : "SQLite import failed.");
  }
  process.exitCode = 1;
});
