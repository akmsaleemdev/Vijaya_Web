import { loadEnvConfig } from "@next/env";
import { getPool, transaction } from "../src/lib/db";

loadEnvConfig(process.cwd());
async function main() {
  const keep = "VIJ-DEMO01";
  await transaction(async (client) => {
    await client.query(`DELETE FROM vijaya."SlotState" WHERE "bookingRef" IS DISTINCT FROM $1`, [keep]);
    await client.query(`DELETE FROM vijaya."SlotState" WHERE "source" = 'OFFLINE_CRM' AND "note" = 'offline demo'`);
    const { rows: oldBookings } = await client.query<{ id: string }>(
      `SELECT "id" FROM vijaya."Booking" WHERE "reference" <> $1`,
      [keep],
    );
    const bookingIds = oldBookings.map(({ id }) => id);
    if (bookingIds.length) {
      await client.query(`DELETE FROM vijaya."Payment" WHERE "bookingId" = ANY($1::text[])`, [bookingIds]);
      await client.query(`DELETE FROM vijaya."Document" WHERE "bookingId" = ANY($1::text[])`, [bookingIds]);
      await client.query(`DELETE FROM vijaya."Milestone" WHERE "bookingId" = ANY($1::text[])`, [bookingIds]);
      await client.query(`DELETE FROM vijaya."Booking" WHERE "id" = ANY($1::text[])`, [bookingIds]);
    }
    const { rows: [remaining] } = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM vijaya."Booking"`);
    console.log(`Cleaned ${oldBookings.length} test bookings. Remaining:`, Number(remaining?.count ?? 0));
  });
}
main()
  .catch((error: unknown) => { console.error("Test booking cleanup failed:", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; })
  .finally(() => getPool().end());
