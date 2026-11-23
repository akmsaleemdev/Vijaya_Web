import { timingSafeEqual } from "node:crypto";
import { expireHolds } from "@/lib/booking/state";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Authorization required." } }, { status: 401 });
  }
  return Response.json({ ok: true, data: { expired: await expireHolds() } });
}
