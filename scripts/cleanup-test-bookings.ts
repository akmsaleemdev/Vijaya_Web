import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const keep = "VIJ-DEMO01";
  const slots = await db.slotState.findMany({ where: { bookingRef: { not: keep } } });
  for (const s of slots) await db.slotState.delete({ where: { id: s.id } });
  // also remove the CRM demo block added by the test script
  const crm = await db.slotState.findMany({ where: { source: "OFFLINE_CRM", note: "offline demo" } });
  for (const s of crm) await db.slotState.delete({ where: { id: s.id } });
  const olds = await db.booking.findMany({ where: { reference: { not: keep } } });
  for (const b of olds) {
    await db.payment.deleteMany({ where: { bookingId: b.id } });
    await db.document.deleteMany({ where: { bookingId: b.id } });
    await db.milestone.deleteMany({ where: { bookingId: b.id } });
    await db.booking.delete({ where: { id: b.id } });
  }
  console.log(`Cleaned ${olds.length} test bookings. Remaining:`, await db.booking.count());
}
main().finally(() => db.$disconnect());
