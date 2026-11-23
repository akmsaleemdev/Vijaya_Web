import { createHash, randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
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
        const attempts = await tx.loginAttempt.findMany({ where: { key: { in: keys } } });
        if (attempts.some((item) => item.failures >= 5 && item.resetAt > now)) return false;
        for (const key of keys) {
          const item = attempts.find((attempt) => attempt.key === key);
          const next = { failures: item && item.resetAt > now ? item.failures + 1 : 1, resetAt: new Date(now.getTime() + lockMs) };
          await tx.loginAttempt.upsert({ where: { key }, create: { key, ...next }, update: next });
        }
        return true;
      });
      if (!allowed) return null;
      const user = await db.adminUser.findUnique({ where: { email } });
      // A dummy bcrypt hash keeps unknown accounts on the same verification path.
      const dummyHash = "$2b$12$5gY2G.ikaoM/aWqElvT3ee7WSpnR.2a2hMtzVDh2BDbB0KMHwIB2O";
      const matches = await compare(password, user?.passwordHash ?? dummyHash);
      if (!matches || !user || user.disabled || !roles.safeParse(user.role).success) return null;
      const sessionId = randomUUID();
      await bookingTransaction(async (tx) => {
        await tx.loginAttempt.deleteMany({ where: { key: keys[0] } });
        await tx.loginAttempt.updateMany({ where: { key: keys[1], failures: { gt: 0 } }, data: { failures: { decrement: 1 } } });
        await tx.adminSession.deleteMany({ where: { expiresAt: { lte: now } } });
        await tx.adminSession.create({ data: { id: sessionId, adminId: user.id, lastSeenAt: now, expiresAt: new Date(now.getTime() + maxAge * 1000) } });
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
      if (typeof token.adminSession === "string") await db.adminSession.deleteMany({ where: { id: token.adminSession } });
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
    db.adminUser.findUnique({ where: { id: adminId }, select: {
      id: true, name: true, email: true, role: true, disabled: true, sessionVersion: true, mustChangePassword: true,
    } }),
    db.adminSession.findUnique({ where: { id: adminSession } }),
  ]);
  const role = roles.safeParse(user?.role);
  const now = new Date();
  if (!user || !role.success || user.disabled || user.sessionVersion !== version ||
      !stored || stored.adminId !== adminId || stored.expiresAt <= now ||
      now.getTime() - stored.lastSeenAt.getTime() >= idleMs) return null;
  if (now.getTime() - stored.lastSeenAt.getTime() >= 60_000) {
    await db.adminSession.updateMany({ where: { id: adminSession }, data: { lastSeenAt: now } });
  }
  return { ...user, role: role.data };
}
