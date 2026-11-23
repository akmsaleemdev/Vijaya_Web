/**
 * My VIJAYA portal authentication — booking-reference + email login with an
 * HMAC-signed session cookie. No third-party dependency; server-side only.
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import type { Booking, Payment, Document, Milestone } from "@/lib/db/types";

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
  const { rows } = await query<Booking>(
    `SELECT * FROM vijaya."Booking"
     WHERE "reference" = $1 AND lower("customerEmail") = $2
       AND "status"::text = ANY($3::text[])
     LIMIT 1`,
    [ref, email.trim().toLowerCase(), ["CONFIRMED", "PENDING_APPROVAL", "PENDING_PAYMENT", "PENDING_HOLD"]],
  );
  return rows[0] ?? null;
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
  const { rows } = await query<Booking & { payments: Payment[]; documents: Document[]; milestones: Milestone[] }>(
    `SELECT b.*,
       COALESCE((SELECT json_agg(p ORDER BY p."createdAt") FROM vijaya."Payment" p WHERE p."bookingId" = b."id"), '[]'::json) AS payments,
       COALESCE((SELECT json_agg(d ORDER BY d."createdAt") FROM vijaya."Document" d WHERE d."bookingId" = b."id"), '[]'::json) AS documents,
       COALESCE((SELECT json_agg(m ORDER BY m."order" DESC) FROM vijaya."Milestone" m WHERE m."bookingId" = b."id"), '[]'::json) AS milestones
     FROM vijaya."Booking" b
     WHERE lower(b."customerEmail") = $1
       AND b."status"::text = ANY($2::text[])
     ORDER BY b."eventDate" DESC`,
    [email.toLowerCase(), ["CONFIRMED", "PENDING_APPROVAL", "PENDING_PAYMENT", "PENDING_HOLD"]],
  );
  return rows;
}
