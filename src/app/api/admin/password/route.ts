import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { access, audit, failure, guard, success } from "@/lib/admin/http";
import { db } from "@/lib/db";
import { bookingTransaction } from "@/lib/booking/transaction";

const password = z.string().min(12).refine((value) => Buffer.byteLength(value) <= 72, "Use at most 72 bytes.");
const input = z.object({ current: z.string().min(1).max(72), password });
export async function POST(req: Request) {
  const actor = await guard(req, access.all, true);
  if (actor instanceof Response) return actor;
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_PASSWORD", "Choose a password of at least 12 characters.", parsed.error.flatten().fieldErrors);
  const user = await db.adminUser.findUnique({ where: { id: actor.admin.id } });
  const { current, password } = parsed.data;
  if (!user || !await compare(current, user.passwordHash) || current === password) return failure(422, "INVALID_PASSWORD", "Enter the current password and choose a different password.");
  const passwordHash = await hash(password, 12);
  const changed = await bookingTransaction(async (tx) => {
    const update = await tx.adminUser.updateMany({ where: { id: user.id, sessionVersion: user.sessionVersion }, data: {
      passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 },
    } });
    if (!update.count) return false;
    await tx.adminSession.deleteMany({ where: { adminId: user.id } });
    await audit(tx, actor, "PASSWORD_CHANGED", "AdminUser", user.id);
    return true;
  });
  return changed ? success({ changed }) : failure(409, "SESSION_CHANGED", "Sign in again before changing your password.");
}
