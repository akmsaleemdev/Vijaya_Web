import { getPool, type DbExecutor } from "@/lib/db";

export const paymentSettingsId = "website";
export async function bookingMode(client: DbExecutor = getPool()) {
  if (process.env.ENABLE_SANDBOX_PAYMENTS !== "true") return "OFFLINE";
  const { rows } = await client.query<{ mode: string }>(
    `SELECT "mode" FROM vijaya."PaymentSettings" WHERE "id" = $1`,
    [paymentSettingsId],
  );
  const settings = rows[0];
  return settings?.mode === "SANDBOX" ? "SANDBOX" : "OFFLINE";
}
