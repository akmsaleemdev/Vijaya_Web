import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { access, audit, failure, guard, success } from "@/lib/admin/http";
import { query } from "@/lib/db";
import { bookingTransaction } from "@/lib/booking/transaction";
import type { AdminUser } from "@/lib/db/types";

const password = z.string().min(12).refine((value) => Buffer.byteLength(value) <= 72, "Use at most 72 bytes.");
const input = z.object({ current: z.string().min(1).max(72), password });
export async function POST(req: Request) {
  const actor = await guard(req, access.all, true);
  if (actor instanceof Response) return actor;
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_PASSWORD", "Choose a password of at least 12 characters.", parsed.error.flatten().fieldErrors);
  const { rows: [user] } = await query<AdminUser>(
    `SELECT * FROM vijaya."AdminUser" WHERE "id" = $1`,
    [actor.admin.id],
  );
  const { current, password } = parsed.data;
  if (!user || !await compare(current, user.passwordHash) || current === password) return failure(422, "INVALID_PASSWORD", "Enter the current password and choose a different password.");
  const passwordHash = await hash(password, 12);
  const changed = await bookingTransaction(async (tx) => {
    const update = await tx.query(
      `UPDATE vijaya."AdminUser"
       SET "passwordHash" = $3, "mustChangePassword" = false, "sessionVersion" = "sessionVersion" + 1, "updatedAt" = now()
       WHERE "id" = $1 AND "sessionVersion" = $2`,
      [user.id, user.sessionVersion, passwordHash],
    );
    if (!update.rowCount) return false;
    await tx.query(`DELETE FROM vijaya."AdminSession" WHERE "adminId" = $1`, [user.id]);
    await audit(tx, actor, "PASSWORD_CHANGED", "AdminUser", user.id);
    return true;
  });
  return changed ? success({ changed }) : failure(409, "SESSION_CHANGED", "Sign in again before changing your password.");
}
