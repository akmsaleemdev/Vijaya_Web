import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const ref = process.argv[2];
if (!ref) throw new Error("usage: bun run scripts/backdate-hold.ts <ref>");
const past = new Date("2026-11-04T00:00:00Z");
const b = await db.booking.update({
  where: { reference: ref },
  data: { holdExpiresAt: past },
});
await db.slotState.updateMany({
  where: { bookingRef: ref, status: "TEMPORARY_HOLD" },
  data: { holdExpiresAt: past },
});
console.log("backdated", b.reference);
await db.$disconnect();
