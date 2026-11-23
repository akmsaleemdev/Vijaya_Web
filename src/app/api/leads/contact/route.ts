import { NextResponse } from "next/server";
import { contact } from "@/lib/lead-capture";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return contact(req);
}
