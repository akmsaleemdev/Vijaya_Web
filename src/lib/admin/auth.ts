import { createHash, randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { query } from "@/lib/db";
import type { AdminSession, AdminUser, LoginAttempt } from "@/lib/db/types";
import { bookingTransaction } from "@/lib/booking/transaction";
import { z } from "zod";

export const roles = z.enum(["SUPER_ADMIN", "MANAGER", "EDITOR", "VIEWER"]);
const credentials = z.object({ email: z.email().trim().toLowerCase().max(160), password: z.string().min(1).max(72) });
const configuredAge = Number(process.env.ADMIN_SESSION_MAX_AGE_MINUTES ?? 480);
const maxAge = (Number.isInteger(configuredAge) && configuredAge >= 5 && configuredAge <= 1440 ? configuredAge : 480) * 60;
const idleMs = 30 * 60_000;
const lockMs = 15 * 60_000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const secure = process.env.NODE_ENV === "production";

export function clientIp(headers: { get(name: string): string | null }) {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  return header ? headers.get(header)?.split(",").at(-1)?.trim().slice(0, 64) ?? "unknown" : "unknown";
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: secure,
  session: { strategy: "jwt", maxAge },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  providers: [Credentials({
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(body, request) {
      if (!process.env.NEXTAUTH_SECRET) return null;
      const input = credentials.safeParse(body);
      if (!input.success || Buffer.byteLength(input.data.password) > 72) return null;
      const { email, password } = input.data;
      const ip = clientIp(new Headers(request.headers as HeadersInit | undefined));
      const keys = [hash("email:" + email), hash("ip:" + ip)];
      const now = new Date();
      const allowed = await bookingTransaction(async (tx) => {
        const { rows: attempts } = await tx.query<LoginAttempt>(
          `SELECT * FROM vijaya."LoginAttempt" WHERE "key" = ANY($1::text[])`,
          [keys],
        );
        if (attempts.some((item) => item.failures >= 5 && item.resetAt > now)) return false;
        for (const key of keys) {
          const item = attempts.find((attempt) => attempt.key === key);
          const next = { failures: item && item.resetAt > now ? item.failures + 1 : 1, resetAt: new Date(now.getTime() + lockMs) };
          await tx.query(
            `INSERT INTO vijaya."LoginAttempt" ("key", "failures", "resetAt")
             VALUES ($1, $2, $3)
             ON CONFLICT ("key") DO UPDATE SET "failures" = EXCLUDED."failures", "resetAt" = EXCLUDED."resetAt"`,
            [key, next.failures, next.resetAt],
          );
        }
        return true;
      });
      if (!allowed) return null;
      const { rows: [user] } = await query<AdminUser>(
        `SELECT * FROM vijaya."AdminUser" WHERE "email" = $1`,
        [email],
      );
      // A dummy bcrypt hash keeps unknown accounts on the same verification path.
      const dummyHash = "$2b$12$5gY2G.ikaoM/aWqElvT3ee7WSpnR.2a2hMtzVDh2BDbB0KMHwIB2O";
      const matches = await compare(password, user?.passwordHash ?? dummyHash);
      if (!matches || !user || user.disabled || !roles.safeParse(user.role).success) return null;
      const sessionId = randomUUID();
      await bookingTransaction(async (tx) => {
        await tx.query(`DELETE FROM vijaya."LoginAttempt" WHERE "key" = $1`, [keys[0]]);
        await tx.query(
          `UPDATE vijaya."LoginAttempt" SET "failures" = "failures" - 1 WHERE "key" = $1 AND "failures" > 0`,
          [keys[1]],
        );
        await tx.query(`DELETE FROM vijaya."AdminSession" WHERE "expiresAt" <= $1`, [now]);
        await tx.query(
          `INSERT INTO vijaya."AdminSession" ("id", "adminId", "lastSeenAt", "expiresAt") VALUES ($1, $2, $3, $4)`,
          [sessionId, user.id, now, new Date(now.getTime() + maxAge * 1000)],
        );
      });
      return { id: user.id, email: user.email, name: user.name, sessionId, sessionVersion: user.sessionVersion };
    },
  })],
  callbacks: {
    jwt({ token, user }) {
      if (user && "sessionId" in user) {
        token.adminSession = user.sessionId;
        token.version = "sessionVersion" in user ? user.sessionVersion : null;
      }
      return token;
    },
    session({ session, token }) {
      return Object.assign(session, { adminId: token.sub, adminSession: token.adminSession, version: token.version });
    },
  },
  events: {
    async signOut({ token }) {
      if (typeof token.adminSession === "string") {
        await query(`DELETE FROM vijaya."AdminSession" WHERE "id" = $1`, [token.adminSession]);
      }
    },
  },
};

const sessionClaims = z.object({ adminId: z.string(), adminSession: z.string().uuid(), version: z.number().int() });
export async function currentAdmin() {
  if (!process.env.NEXTAUTH_SECRET) return null;
  const claims = sessionClaims.safeParse(await getServerSession(authOptions));
  if (!claims.success) return null;
  const { adminId, adminSession, version } = claims.data;
  const [user, stored] = await Promise.all([
    query<Pick<AdminUser, "id" | "name" | "email" | "role" | "disabled" | "sessionVersion" | "mustChangePassword">>(
      `SELECT "id", "name", "email", "role", "disabled", "sessionVersion", "mustChangePassword"
       FROM vijaya."AdminUser" WHERE "id" = $1`,
      [adminId],
    ),
    query<AdminSession>(`SELECT * FROM vijaya."AdminSession" WHERE "id" = $1`, [adminSession]),
  ]);
  const admin = user.rows[0];
  const session = stored.rows[0];
  const role = roles.safeParse(admin?.role);
  const now = new Date();
  if (!admin || !role.success || admin.disabled || admin.sessionVersion !== version ||
      !session || session.adminId !== adminId || session.expiresAt <= now ||
      now.getTime() - session.lastSeenAt.getTime() >= idleMs) return null;
  if (now.getTime() - session.lastSeenAt.getTime() >= 60_000) {
    await query(
      `UPDATE vijaya."AdminSession" SET "lastSeenAt" = $2 WHERE "id" = $1`,
      [adminSession, now],
    );
  }
  return { ...admin, role: role.data };
}
