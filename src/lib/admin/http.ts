import type { Prisma } from "@prisma/client";
import { currentAdmin, clientIp } from "./auth";

type Role = NonNullable<Awaited<ReturnType<typeof currentAdmin>>>["role"];
export const access = {
  all: ["SUPER_ADMIN", "MANAGER", "EDITOR", "VIEWER"],
  bookings: ["SUPER_ADMIN", "MANAGER", "VIEWER"],
  operations: ["SUPER_ADMIN", "MANAGER"],
  content: ["SUPER_ADMIN", "MANAGER", "EDITOR"],
  owner: ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export const success = (data: unknown, status = 200) => Response.json({ ok: true, data }, { status, headers: { "Cache-Control": "no-store" } });
export const failure = (status: number, code: string, message: string, fields?: unknown) =>
  Response.json({ ok: false, error: { code, message, fields } }, { status, headers: { "Cache-Control": "no-store" } });

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = process.env.NEXTAUTH_URL ?? req.url;
  return origin === new URL(expected).origin;
}

export async function guard(req: Request, allowed: readonly Role[], changingPassword = false) {
  const admin = await currentAdmin();
  if (!admin) return failure(401, "UNAUTHORIZED", "Sign in to continue.");
  if (!allowed.includes(admin.role)) return failure(403, "FORBIDDEN", "Your role does not allow this action.");
  if (admin.mustChangePassword && !changingPassword) return failure(403, "PASSWORD_CHANGE_REQUIRED", "Change your temporary password to continue.");
  if (!["GET", "HEAD"].includes(req.method) && !sameOrigin(req)) return failure(403, "ORIGIN_MISMATCH", "Open the admin panel before submitting changes.");
  return { admin, ip: clientIp(req.headers) };
}

export type Identity = Exclude<Awaited<ReturnType<typeof guard>>, Response>;
export async function audit(tx: Prisma.TransactionClient, actor: Identity, action: string, entity: string, entityRef: string, before?: unknown, after?: unknown) {
  return tx.auditLog.create({ data: {
    action, entity, entityRef, actorId: actor.admin.id, ip: actor.ip,
    beforeJson: before === undefined ? undefined : JSON.stringify(before), afterJson: after === undefined ? undefined : JSON.stringify(after),
  } });
}
