import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { z } from "zod";
import { SPACES } from "../src/lib/data/spaces";
import { getPool, transaction } from "../src/lib/db";
import { seedContent } from "./seed-content";

loadEnvConfig(process.cwd());

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  const email = process.env.SEED_ADMIN_EMAIL;
  let passwordHash: string | null = null;
  let normalizedEmail: string | null = null;
  if (password && email) {
    if (Buffer.byteLength(password) < 8 || Buffer.byteLength(password) > 72) {
      throw new Error("Bootstrap password must be 8–72 bytes.");
    }
    passwordHash = await hash(password, 12);
    normalizedEmail = z.email().parse(email.trim().toLowerCase());
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to provision the Super Admin.");
  }

  await transaction(async (client) => {
    console.log("Seeding VIJAYA booking inventory…");
    for (const space of SPACES) {
      await client.query(
        `INSERT INTO vijaya."Space"
          ("id","name","category","setting","capacityMin","capacityMax","bookableOnline","requiresApproval","availabilityEnabled","active","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,now())
         ON CONFLICT ("id") DO NOTHING`,
        [
          space.slug, space.officialName, space.venueCategory, space.indoorOrOutdoor,
          space.guestRange?.[0] ?? null, space.guestRange?.[1] ?? null,
          space.bookableOnline, space.requiresManualApproval, space.availabilityEnabled,
        ],
      );
    }

    if (passwordHash && normalizedEmail) {
      const { rows: [existing] } = await client.query<{ found: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM vijaya."AdminUser" WHERE "role" = 'SUPER_ADMIN') AS found`,
      );
      if (!existing?.found) {
        await client.query(
          `INSERT INTO vijaya."AdminUser"
            ("id","email","name","passwordHash","role","createdAt","updatedAt")
           VALUES ($1,$2,'VIJAYA Administrator',$3,'SUPER_ADMIN',now(),now())`,
          [randomUUID(), normalizedEmail, passwordHash],
        );
      }
    }
    console.log(`CMS seed wrote ${await seedContent(client, process.argv.includes("--force"))} entries.`);

    if (process.env.SEED_DEMO_DATA !== "true" || process.env.NODE_ENV === "production") return;
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);
    const today = new Date();
    const demoBlocks = [
      { space: "periyar", offset: 9, slot: "EVENING", status: "CONFIRMED", note: "Sample offline booking (demo)" },
      { space: "periyar", offset: 21, slot: "FULL_DAY", status: "MAINTENANCE", note: "Sample maintenance block (demo)" },
      { space: "nila", offset: 9, slot: "EVENING", status: "CONFIRMED", note: "Sample offline booking (demo)" },
      { space: "pamba", offset: 15, slot: "MORNING", status: "INTERNAL_USE", note: "Sample internal use (demo)" },
    ] as const;
    for (const block of demoBlocks) {
      const date = formatDate(new Date(today.getTime() + block.offset * 86400000));
      await client.query(
        `INSERT INTO vijaya."SlotState"
          ("id","spaceId","date","slot","status","source","note","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,now()) ON CONFLICT ("spaceId","date","slot") DO NOTHING`,
        [randomUUID(), block.space, date, block.slot, block.status, "OFFLINE_CRM", block.note],
      );
    }

    const demoRef = "VIJ-DEMO01";
    const eventDate = formatDate(new Date(today.getTime() + 75 * 86400000));
    const { rows: [existingBooking] } = await client.query<{ id: string }>(
      `SELECT "id" FROM vijaya."Booking" WHERE "reference" = $1`,
      [demoRef],
    );
    if (!existingBooking) {
      const bookingId = randomUUID();
      const { rows: [booking] } = await client.query<{ id: string }>(
        `INSERT INTO vijaya."Booking"
          ("id","reference","spaceId","spaceName","childSpaceIds","eventType","eventDate","slot","guests","status",
           "customerName","customerPhone","customerEmail","customerCountry","notes","baseAmount","weekendUplift",
           "taxAmount","depositAmount","totalPayable","crmSync","confirmedAt","updatedAt")
         VALUES ($1,$2,'periyar','Periyar','["periyar"]','WEDDING',$3,'EVENING',800,'CONFIRMED',
           'Demo Guest','+91 90000 00000','demo@vijaya.example','United Arab Emirates',
           'Demo booking created by the seed for the My VIJAYA walkthrough. Not a real event.',
           200000,20000,26400,55000,61600,'QUEUED',now(),now()) RETURNING "id"`,
        [bookingId, demoRef, eventDate],
      );
      if (!booking) throw new Error("Demo booking insert returned no row.");
      const range = { startMinute: 1080, endMinute: 1380 };
      await client.query(
        `INSERT INTO vijaya."SlotState"
          ("id","spaceId","date","slot","startMinute","endMinute","status","source","bookingRef","updatedAt")
         VALUES ($1,'periyar',$2,'EVENING',$3,$4,'CONFIRMED','ONLINE',$5,now())
         ON CONFLICT ("spaceId","date","slot") DO NOTHING`,
        [randomUUID(), eventDate, range.startMinute, range.endMinute, demoRef],
      );
      await client.query(
        `INSERT INTO vijaya."Payment"
          ("id","bookingId","provider","providerRef","idempotencyKey","amount","status","method","transactionId","updatedAt")
         VALUES ($1,$2,'SANDBOX','SBX-DEMO0001','seed-demo-1',61600,'SUCCESS','sandbox','TXN-DEMO-0001',now())`,
        [randomUUID(), booking.id],
      );
      const docs = [
        ["CONFIRMATION", "Booking Confirmation"],
        ["INVOICE", `Invoice — Booking ${demoRef}`],
        ["RECEIPT", "Payment Receipt — SBX-DEMO0001"],
        ["AGREEMENT", "Venue Booking Agreement"],
      ];
      for (const [type, title] of docs) {
        await client.query(
          `INSERT INTO vijaya."Document" ("id","bookingId","type","title") VALUES ($1,$2,$3,$4)`,
          [randomUUID(), booking.id, type, title],
        );
      }
      const milestones = [
        [60, "Planning consultation", "Meet your event manager and shape the run of show."],
        [30, "Vendor coordination", "Share your vendor list and timelines with the VIJAYA team."],
        [15, "Layout & finalisation", "Confirm seating layouts, stage plan and AV requirements."],
        [7, "Final walkthrough", "Walk the space with your event manager and sign off the plan."],
        [0, "Your event day", "Welcome to VIJAYA. We will take it from here."],
      ] as const;
      for (const [order, title, detail] of milestones) {
        const dueDate = formatDate(new Date(Date.parse(eventDate + "T00:00:00Z") - order * 86400000));
        await client.query(
          `INSERT INTO vijaya."Milestone" ("id","bookingId","title","detail","dueDate","status","order")
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [randomUUID(), booking.id, title, detail, dueDate, Date.parse(dueDate) < Date.now() ? "DONE" : "UPCOMING", order],
        );
      }
      console.log("Demo booking created:", demoRef, "/ demo@vijaya.example");
    }
  });
  console.log("Seed complete.");
}

if (process.argv[1] && basename(process.argv[1]) === "db-seed.ts") {
  main()
    .catch((error: unknown) => {
      console.error("Database seed failed:", error instanceof Error ? error.message : "unknown error");
      process.exitCode = 1;
    })
    .finally(() => getPool().end());
}
