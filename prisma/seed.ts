/**
 * VIJAYA seed — syncs bookable inventory into the DB and creates demo state.
 * Run: npx tsx prisma/seed.ts (or bun prisma/seed.ts)
 */
import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { seedContent } from "./seed-content";
import { SPACES } from "../src/lib/data/spaces";

loadEnvConfig(process.cwd());
const db = new PrismaClient();

async function main() {
  console.log("Seeding VIJAYA booking inventory…");

  for (const s of SPACES) {
    await db.space.upsert({
      where: { id: s.slug },
      create: {
        id: s.slug,
        name: s.officialName,
        category: s.venueCategory,
        setting: s.indoorOrOutdoor,
        capacityMin: s.guestRange?.[0] ?? null,
        capacityMax: s.guestRange?.[1] ?? null,
        bookableOnline: s.bookableOnline,
        requiresApproval: s.requiresManualApproval,
        availabilityEnabled: s.availabilityEnabled,
        active: true,
      },
      update: {},
    });
  }

  if (!await db.adminUser.findFirst({ where: { role: "SUPER_ADMIN" } })) {
    const password = process.env.SEED_ADMIN_PASSWORD;
    const email = process.env.SEED_ADMIN_EMAIL;
    if (!password || !email) {
      if (process.env.NODE_ENV === "production") throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to provision the Super Admin.");
    } else {
      if (Buffer.byteLength(password) < 8 || Buffer.byteLength(password) > 72) throw new Error("Bootstrap password must be 8–72 bytes.");
      const passwordHash = await hash(password, 12);
      await db.$transaction(async (tx) => {
        if (await tx.adminUser.findFirst({ where: { role: "SUPER_ADMIN" } })) return;
        await tx.adminUser.create({ data: {
          email: z.email().parse(email.trim().toLowerCase()), name: "VIJAYA Administrator", passwordHash, role: "SUPER_ADMIN",
        } });
      });
    }
  }
  console.log(`CMS seed wrote ${await seedContent(db, process.argv.includes("--force"))} entries.`);
  if (process.env.SEED_DEMO_DATA !== "true" || process.env.NODE_ENV === "production") return;

  // Sample CRM-side blocks so the calendar demonstrates the offline booking sync.
  // These are DEMO rows — cleared by re-seeding; the CRM endpoint manages real ones.
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const demoBlocks = [
    { space: "periyar", offset: 9, slot: "EVENING", note: "Sample offline booking (demo)" },
    { space: "periyar", offset: 21, slot: "FULL_DAY", note: "Sample maintenance block (demo)" },
    { space: "nila", offset: 9, slot: "EVENING", note: "Sample offline booking (demo)" },
    { space: "pamba", offset: 15, slot: "MORNING", note: "Sample internal use (demo)" },
  ];
  for (const b of demoBlocks) {
    const d = new Date(today.getTime() + b.offset * 86400000);
    await db.slotState.upsert({
      where: { spaceId_date_slot: { spaceId: b.space, date: fmt(d), slot: b.slot } },
      create: { spaceId: b.space, date: fmt(d), slot: b.slot, status: b.note.includes("maintenance") ? "MAINTENANCE" : b.note.includes("internal") ? "INTERNAL_USE" : "CONFIRMED", source: "OFFLINE_CRM", note: b.note },
      update: {},
    });
  }

  // Demo confirmed booking for My VIJAYA walkthrough (clearly marked demo).
  const demoRef = "VIJ-DEMO01";
  const eventDate = new Date(today.getTime() + 75 * 86400000);
  const demoEventDate = fmt(eventDate);
  const existing = await db.booking.findUnique({ where: { reference: demoRef } });
  if (!existing) {
    const booking = await db.booking.create({
      data: {
        reference: demoRef,
        spaceId: "periyar",
        spaceName: "Periyar",
        childSpaceIds: JSON.stringify(["periyar"]),
        eventType: "WEDDING",
        eventDate: demoEventDate,
        slot: "EVENING",
        guests: 800,
        status: "CONFIRMED",
        customerName: "Demo Guest",
        customerPhone: "+91 90000 00000",
        customerEmail: "demo@vijaya.example",
        customerCountry: "United Arab Emirates",
        notes: "Demo booking created by the seed for the My VIJAYA walkthrough. Not a real event.",
        baseAmount: 200000,
        weekendUplift: 20000,
        taxAmount: 26400,
        depositAmount: 55000,
        totalPayable: 61600,
        crmSync: "QUEUED",
        confirmedAt: new Date(),
      },
    });
    await db.slotState.upsert({
      where: { spaceId_date_slot: { spaceId: "periyar", date: demoEventDate, slot: "EVENING" } },
      create: { spaceId: "periyar", date: demoEventDate, slot: "EVENING", status: "CONFIRMED", source: "ONLINE", bookingRef: demoRef },
      update: {},
    });
    await db.payment.create({
      data: {
        bookingId: booking.id,
        provider: "SANDBOX",
        providerRef: "SBX-DEMO0001",
        idempotencyKey: "seed-demo-1",
        amount: 61600,
        status: "SUCCESS",
        method: "sandbox",
        transactionId: "TXN-DEMO-0001",
      },
    });
    await db.document.createMany({
      data: [
        { bookingId: booking.id, type: "CONFIRMATION", title: "Booking Confirmation" },
        { bookingId: booking.id, type: "INVOICE", title: `Invoice — Booking ${demoRef}` },
        { bookingId: booking.id, type: "RECEIPT", title: "Payment Receipt — SBX-DEMO0001" },
        { bookingId: booking.id, type: "AGREEMENT", title: "Venue Booking Agreement" },
      ],
    });
    const ed = new Date(demoEventDate + "T00:00:00Z");
    const ms = (daysBack: number, title: string, detail: string) => {
      const d = new Date(ed.getTime() - daysBack * 86400000);
      const past = d.getTime() < Date.now();
      return { bookingId: booking.id, title, detail, dueDate: d.toISOString().slice(0, 10), status: past ? "DONE" : "UPCOMING", order: daysBack };
    };
    await db.milestone.createMany({
      data: [
        ms(60, "Planning consultation", "Meet your event manager and shape the run of show."),
        ms(30, "Vendor coordination", "Share your vendor list and timelines with the VIJAYA team."),
        ms(15, "Layout & finalisation", "Confirm seating layouts, stage plan and AV requirements."),
        ms(7, "Final walkthrough", "Walk the space with your event manager and sign off the plan."),
        ms(0, "Your event day", "Welcome to VIJAYA. We will take it from here."),
      ],
    });
    console.log("Demo booking created:", demoRef, "/ demo@vijaya.example");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
