import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import pg from "pg";

type GlobalWithPool = typeof globalThis & { vijayaPgPool?: Pool };

const globalWithPool = globalThis as GlobalWithPool;

export type DbExecutor = Pick<PoolClient, "query">;

pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

export function getPool(): Pool {
  if (globalWithPool.vijayaPgPool) return globalWithPool.vijayaPgPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 });
  pool.on("error", (error) => {
    const code = "code" in error ? String(error.code) : error.name;
    console.error("Unexpected PostgreSQL pool error.", code);
  });
  globalWithPool.vijayaPgPool = pool;
  return pool;
}

export function query<Row extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<Row>> {
  return getPool().query<Row>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO vijaya, extensions, public");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("PostgreSQL rollback failed.", rollbackError instanceof Error ? rollbackError.message : "unknown error");
    }
    throw error;
  } finally {
    client.release();
  }
}