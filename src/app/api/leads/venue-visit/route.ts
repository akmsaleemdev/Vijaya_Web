import { NextResponse } from "next/server";
import { venueVisit } from "@/lib/lead-capture";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return venueVisit(req);
}
