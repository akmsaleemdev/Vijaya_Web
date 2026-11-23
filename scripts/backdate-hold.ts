import { loadEnvConfig } from "@next/env";
import { getPool, transaction } from "../src/lib/db";

loadEnvConfig(process.cwd());
const ref = process.argv[2];
if (!ref) throw new Error("usage: node --import tsx scripts/backdate-hold.ts <ref>");
const past = new Date("2026-11-04T00:00:00Z");
try {
  await transaction(async (client) => {
    const { rows: [booking] } = await client.query<{ reference: string }>(
      `UPDATE vijaya."Booking" SET "holdExpiresAt" = $2, "updatedAt" = now() WHERE "reference" = $1 RETURNING "reference"`,
      [ref, past],
    );
    if (!booking) throw new Error(`Booking ${ref} was not found.`);
    await client.query(
      `UPDATE vijaya."SlotState" SET "holdExpiresAt" = $2, "updatedAt" = now()
       WHERE "bookingRef" = $1 AND "status" = 'TEMPORARY_HOLD'`,
      [ref, past],
    );
    console.log("backdated", booking.reference);
  });
} finally {
  await getPool().end();
}
