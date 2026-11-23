import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Serialize application mutations across Vercel instances. The database's
 * exclusion constraint independently protects reservations from other writers.
 */
export function bookingTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261123, 1) IS NULL AS locked`;
    return work(tx);
  }, { maxWait: 15_000, timeout: 20_000 });
}
