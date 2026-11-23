import { NextResponse } from "next/server";
import { verifyPortalCredentials, setPortalCookie } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/portal/login — My VIJAYA access.
 * Credentials: booking reference + the email used at booking.
 */
export async function POST(req: Request) {
  try {
    const { reference, email } = await req.json();
    if (!reference || !email) {
      return NextResponse.json({ error: "Booking reference and email are required." }, { status: 400 });
    }
    const booking = await verifyPortalCredentials(String(reference), String(email));
    if (!booking) {
      return NextResponse.json(
        {
          error: "We couldn't match that reference and email.",
          detail: "Check the confirmation email or message from VIJAYA — the reference looks like VIJ-XXXXXX and the email is the one you booked with.",
        },
        { status: 401 }
      );
    }
    await setPortalCookie(booking.reference, booking.customerEmail);
    return NextResponse.json({ ok: true, reference: booking.reference });
  } catch (e) {
    console.error("portal/login error", e);
    return NextResponse.json({ error: "Sign-in failed. Please try again." }, { status: 500 });
  }
}
