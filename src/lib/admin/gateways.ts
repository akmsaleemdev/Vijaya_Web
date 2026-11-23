import { createCipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { query } from "@/lib/db";
import { bookingTransaction } from "@/lib/booking/transaction";
import { bookingMode, paymentSettingsId } from "@/lib/payments/settings";
import { audit, failure, success, type Identity } from "./http";
import type { GatewayCredential, PaymentSettings } from "@/lib/db/types";

const provider = z.enum(["RAZORPAY", "STRIPE"]);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SETTINGS"), mode: z.enum(["OFFLINE", "SANDBOX"]), provider: z.enum(["SIMULATOR", "RAZORPAY", "STRIPE"]) }),
  z.object({ action: z.literal("SAVE_TEST_KEYS"), provider, keyId: z.string().trim().max(250), secret: z.string().trim().min(8).max(500), webhookSecret: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("REMOVE_TEST_KEYS"), provider }),
]);

function encryptionKey() {
  const key = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY;
  return key && /^[a-f0-9]{64}$/i.test(key) ? Buffer.from(key, "hex") : null;
}

function encrypt(key: Buffer, provider: string, credentials: { secret: string; webhookSecret?: string }) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("vijaya:gateway-test:" + provider));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials)), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((buffer) => buffer.toString("base64url")).join(".");
}

export async function gateways(req: Request, actor: Identity) {
  if (req.method === "GET") {
    const [{ rows: [settings] }, { rows: credentials }, mode] = await Promise.all([
      query<PaymentSettings>(`SELECT * FROM vijaya."PaymentSettings" WHERE "id" = $1`, [paymentSettingsId]),
      query<Pick<GatewayCredential, "provider" | "keyId" | "updatedAt">>(`SELECT "provider", "keyId", "updatedAt" FROM vijaya."GatewayCredential"`),
      bookingMode(),
    ]);
    return success({
      mode, provider: settings?.provider ?? "SIMULATOR", sandboxAllowed: process.env.ENABLE_SANDBOX_PAYMENTS === "true",
      encryptionConfigured: !!encryptionKey(), credentials: credentials.map(({ keyId, ...rest }) => ({ ...rest, lastFour: keyId.slice(-4) })),
    });
  }
  const result = input.safeParse(await req.json().catch(() => null));
  if (!result.success) return failure(422, "INVALID_GATEWAY_SETTINGS", "Check the gateway settings.");
  const action = result.data;
  if (action.action === "SETTINGS") {
    if (action.mode === "SANDBOX" && process.env.ENABLE_SANDBOX_PAYMENTS !== "true") {
      return failure(409, "SANDBOX_NOT_ENABLED", "Enable sandbox payments in this deployment first.");
    }
    return bookingTransaction(async (tx) => {
      const { rows: [before] } = await tx.query<PaymentSettings>(`SELECT * FROM vijaya."PaymentSettings" WHERE "id" = $1`, [paymentSettingsId]);
      const { rows: [after] } = await tx.query<PaymentSettings>(
        `INSERT INTO vijaya."PaymentSettings" ("id", "mode", "provider", "updatedAt")
         VALUES ($1,$2,$3,now())
         ON CONFLICT ("id") DO UPDATE SET "mode" = EXCLUDED."mode", "provider" = EXCLUDED."provider", "updatedAt" = now()
         RETURNING *`,
        [paymentSettingsId, action.mode, action.provider],
      );
      if (!after) throw new Error("Payment settings write returned no row.");
      await audit(tx, actor, "BOOKING_PAYMENT_MODE_UPDATED", "PaymentSettings", paymentSettingsId, before, after);
      return success(after);
    });
  }
  if (action.action === "REMOVE_TEST_KEYS") return bookingTransaction(async (tx) => {
    await tx.query(`DELETE FROM vijaya."GatewayCredential" WHERE "provider" = $1`, [action.provider]);
    await audit(tx, actor, "GATEWAY_TEST_KEYS_REMOVED", "GatewayCredential", action.provider);
    return success({ provider: action.provider });
  });
  const key = encryptionKey();
  if (!key) return failure(409, "ENCRYPTION_NOT_CONFIGURED", "Configure the deployment encryption key before saving test credentials.");
  const valid = action.provider === "RAZORPAY"
    ? /^rzp_test_[A-Za-z0-9]+$/.test(action.keyId)
    : /^pk_test_[A-Za-z0-9]+$/.test(action.keyId) && /^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(action.secret);
  if (!valid || /^rzp_live_|^(?:sk|rk|pk)_live_/.test(action.secret)) {
    return failure(422, "TEST_KEYS_REQUIRED", "Enter test-mode credentials for the selected provider.");
  }
  const encrypted = encrypt(key, action.provider, { secret: action.secret, webhookSecret: action.webhookSecret || undefined });
  return bookingTransaction(async (tx) => {
    await tx.query(
      `INSERT INTO vijaya."GatewayCredential" ("provider", "keyId", "encrypted", "updatedAt")
       VALUES ($1,$2,$3,now())
       ON CONFLICT ("provider") DO UPDATE SET "keyId" = EXCLUDED."keyId", "encrypted" = EXCLUDED."encrypted", "updatedAt" = now()`,
      [action.provider, action.keyId, encrypted],
    );
    await audit(tx, actor, "GATEWAY_TEST_KEYS_SAVED", "GatewayCredential", action.provider);
    return success({ provider: action.provider, lastFour: action.keyId.slice(-4) });
  });
}
