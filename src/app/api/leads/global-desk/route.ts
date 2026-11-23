import { NextResponse } from "next/server";
import { globalDesk } from "@/lib/lead-capture";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return globalDesk(req);
}
