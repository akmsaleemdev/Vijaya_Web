import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const paymentSettingsId = "website";
export async function bookingMode(client: Pick<Prisma.TransactionClient, "paymentSettings"> = db) {
  if (process.env.ENABLE_SANDBOX_PAYMENTS !== "true") return "OFFLINE";
  const settings = await client.paymentSettings.findUnique({ where: { id: paymentSettingsId }, select: { mode: true } });
  return settings?.mode === "SANDBOX" ? "SANDBOX" : "OFFLINE";
}
