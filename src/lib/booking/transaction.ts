import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

let queue: Promise<unknown> = Promise.resolve();

/** SQLite permits one writer. Queue this process's writes and let SQLite enforce
 * the same invariants across other processes and connections. */
export function bookingTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const task = queue.then(() => db.$transaction(work, { timeout: 10_000 }));
  queue = task.catch(() => undefined);
  return task;
}
