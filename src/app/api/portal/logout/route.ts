import { NextResponse } from "next/server";
import { clearPortalCookie } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearPortalCookie();
  return NextResponse.json({ ok: true });
}
