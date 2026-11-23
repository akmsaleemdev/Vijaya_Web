import { NextResponse } from "next/server";
import { planEvent } from "@/lib/lead-capture";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return planEvent(req);
}
