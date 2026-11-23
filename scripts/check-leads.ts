import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const leads = await db.lead.findMany({
  orderBy: { createdAt: "desc" },
  take: 6,
  select: { type: true, name: true, email: true, eventDate: true, stage: true, createdAt: true },
});
console.log(JSON.stringify(leads, null, 1));
await db.$disconnect();
