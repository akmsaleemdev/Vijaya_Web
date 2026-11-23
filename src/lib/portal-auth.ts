/**
 * My VIJAYA portal authentication — booking-reference + email login with an
 * HMAC-signed session cookie. No third-party dependency; server-side only.
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE = "vijaya_portal";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("Configure AUTH_SECRET for portal sessions.");
  return value;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export interface PortalSession {
  reference: string;
  email: string;
  exp: number;
}

export function createSessionToken(reference: string, email: string): string {
  const payload: PortalSession = { reference, email, exp: Date.now() + MAX_AGE * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): PortalSession | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as PortalSession;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Verify credentials: booking reference + the email on that booking. */
export async function verifyPortalCredentials(reference: string, email: string) {
  const ref = reference.trim().toUpperCase();
  const booking = await db.booking.findFirst({
    where: { reference: ref, customerEmail: { equals: email.trim().toLowerCase(), }, status: { in: ["CONFIRMED", "PENDING_PAYMENT", "HOLD"] } },
  });
  return booking;
}

export async function setPortalCookie(reference: string, email: string) {
  const store = await cookies();
  store.set(COOKIE, createSessionToken(reference, email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearPortalCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token || !(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)) return null;
  return verifySessionToken(token);
}

/** All bookings belonging to the signed-in customer (same email). */
export async function getPortalBookings(email: string) {
  return db.booking.findMany({
    where: { customerEmail: email.toLowerCase(), status: { in: ["CONFIRMED", "PENDING_PAYMENT", "HOLD"] } },
    include: { payments: true, documents: true, milestones: { orderBy: { order: "desc" } } },
    orderBy: { eventDate: "desc" },
  });
}
