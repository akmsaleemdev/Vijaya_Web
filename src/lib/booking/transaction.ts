import type { PoolClient } from "pg";
import { transaction } from "@/lib/db";

/**
 * Serialize application mutations across Vercel instances. The database's
 * exclusion constraint independently protects reservations from other writers.
 */
export function bookingTransaction<T>(work: (tx: PoolClient) => Promise<T>): Promise<T> {
  return transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock($1, $2)", [20261123, 1]);
    return work(tx);
  });
}
