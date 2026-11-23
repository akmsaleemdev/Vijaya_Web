import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { indiaDate, intervals, overlaps, utcRange } from "../src/lib/booking/slots";

test("slot arithmetic treats adjacent intervals as free and detects partial/full-day overlaps", () => {
  assert.equal(overlaps(intervals.MORNING, intervals.AFTERNOON), false);
  assert.equal(overlaps(intervals.FULL_DAY, intervals.EVENING), true);
  assert.equal(overlaps([700, 800], intervals.AFTERNOON), true);
  assert.equal(indiaDate(new Date("2026-12-04T18:30:00Z")), "2026-12-05");
  assert.equal(utcRange("2026-12-05", 0, 1440).startAt.toISOString(), "2026-12-04T18:30:00.000Z");
  assert.equal(utcRange("2026-12-05", 0, 1440).endAt.toISOString(), "2026-12-05T18:30:00.000Z");
});

const directory = mkdtempSync(path.join(tmpdir(), "vijaya-test-"));
const database = process.env.CMS_TEST_DATABASE_URL;
const testUrl = database && new URL(database);
if (!testUrl || !["localhost", "127.0.0.1", "[::1]"].includes(testUrl.hostname) ||
    !testUrl.pathname.endsWith("_test") || testUrl.searchParams.get("schema") !== "vijaya") {
  throw new Error("Set CMS_TEST_DATABASE_URL to an empty local PostgreSQL database ending in _test with schema=vijaya.");
}
const base = `http://localhost:${process.env.CMS_TEST_PORT ?? "3713"}`;
const port = new URL(base).port;
const bootstrap = process.env.CMS_TEST_BOOTSTRAP_PASSWORD ?? randomBytes(18).toString("hex");
const newPassword = randomBytes(18).toString("hex");
const email = process.env.CMS_TEST_BOOTSTRAP_EMAIL ?? "integration@example.test";
const cron = randomBytes(24).toString("hex");
const env = {
  ...process.env, DATABASE_URL: database, DIRECT_URL: database, NEXTAUTH_URL: base, NEXTAUTH_SECRET: randomBytes(32).toString("hex"),
  SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: bootstrap, CRON_SECRET: cron, ENABLE_SANDBOX_PAYMENTS: "true",
  PAYMENT_CONFIG_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  UPLOADS_DIR: path.join(directory, "uploads"), PORT: port, HOSTNAME: "0.0.0.0", SEED_DEMO_DATA: "false",
};
let server: ReturnType<typeof spawn> | undefined;
let bootLog = "";
before(async () => {
  const cli = process.platform === "win32" ? "npm.cmd" : "npm";
  const run = (script: string) => {
    const result = spawnSync(cli, ["run", script], { env, encoding: "utf8", shell: process.platform === "win32" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  };
  run("db:deploy");
  const pool = new Pool({ connectionString: database });
  try {
    const { rows: [result] } = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM vijaya."AdminUser"`);
    assert.equal(Number(result?.count ?? 0), 0, "Use a fresh test database.");
  } finally {
    await pool.end();
  }
  run("db:seed");
  server = spawn(process.execPath, [".next/standalone/server.js"], { env: { ...env, DIRECT_URL: undefined }, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout?.on("data", (chunk) => { bootLog += String(chunk); });
  server.stderr?.on("data", (chunk) => { bootLog += String(chunk); });
  for (let count = 0; count < 90; count++) {
    if (await fetch(base + "/admin/login").then((response) => response.ok).catch(() => false)) return;
    if (server.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  assert.fail("The standalone site did not start. Run npm run build:standalone before tests.\n" + bootLog);
}, { timeout: 60_000 });
after(() => {
  server?.kill();
  rmSync(directory, { recursive: true, force: true });
});

function cookies(res: Response) {
  return res.headers.getSetCookie().map((item) => item.split(";")[0]).join("; ");
}
async function signIn(password: string, username = email) {
  const res = await fetch(base + "/api/auth/csrf");
  const { csrfToken } = await res.json();
  const response = await fetch(base + "/api/auth/callback/credentials", {
    method: "POST", redirect: "manual", headers: { origin: base, cookie: cookies(res), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, email: username, password, json: "true", callbackUrl: base + "/admin" }),
  });
  return cookies(response).split("; ").find((part) => /next-auth\.session-token=.+/.test(part)) ?? "";
}
function api(url: string, method = "GET", payload?: unknown, cookie?: string, extra?: Record<string, string>) {
  return fetch(base + url, {
    method, redirect: "manual", headers: { origin: base, ...(cookie ? { cookie } : {}), ...(payload ? { "content-type": "application/json" } : {}), ...extra },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}
const future = (days: number) => indiaDate(new Date(Date.now() + days * 86400000));
const baseBooking = { spaceSlug: "periyar", date: future(5), slot: "EVENING", guests: 800, eventType: "WEDDING" };
const manual = { ...baseBooking, customer: { name: "Test Guest", phone: "+91 11111 11111", email: "guest@example.test" } };

test("standalone CMS authentication, atomic booking and publishing", { timeout: 60_000 }, async () => {
  assert.equal((await api("/api/admin/bookings")).status, 401);
  const unauthenticated = await api("/admin");
  assert.ok([302, 307, 308].includes(unauthenticated.status));
  assert.match(unauthenticated.headers.get("location") ?? "", /\/admin\/login$/);
  const temporary = await signIn(bootstrap);
  assert.ok(temporary, bootLog);
  assert.equal((await api("/api/admin/bookings", "GET", undefined, temporary)).status, 403);
  assert.equal((await api("/api/admin/password", "POST", { current: bootstrap, password: newPassword }, temporary)).status, 200);
  assert.equal((await api("/api/admin/bookings", "GET", undefined, temporary)).status, 401);
  const admin = await signIn(newPassword);
  assert.ok(admin);
  assert.equal((await api("/admin", "GET", undefined, admin)).status, 200);
  assert.equal((await api("/api/admin/bookings?export=xlsx", "GET", undefined, admin)).status, 200);

  const holds = await Promise.all(Array.from({ length: 20 }, () => api("/api/booking/hold", "POST", baseBooking)));
  const results = holds.map((response) => response.status);
  assert.equal(results.filter((status) => status === 200).length, 1, JSON.stringify(results) + bootLog);
  assert.equal(results.filter((status) => status === 409).length, 19, JSON.stringify(results) + bootLog);
  const winner = await holds.find((response) => response.status === 200)!.json();
  const winnerPath = "/api/admin/bookings/" + winner.reference;
  assert.equal((await api(winnerPath, "GET", undefined, admin)).status, 200);
  assert.equal((await api("/api/admin/bookings", "POST", { ...manual, slot: "FULL_DAY" }, admin)).status, 409);
  assert.equal((await api(winnerPath, "PATCH", { action: "CANCEL", reason: "Integration teardown" }, admin)).status, 200);
  const replacement = await api("/api/admin/bookings", "POST", { ...manual, slot: "FULL_DAY" }, admin);
  assert.equal(replacement.status, 201, await replacement.clone().text());
  assert.equal((await api("/api/booking/hold", "POST", baseBooking)).status, 409);

  const date = future(6);
  const block = await api("/api/admin/blocks", "POST", { from: date, to: date, venue: "periyar", slot: "FULL_DAY", reason: "Maintenance" }, admin);
  assert.equal(block.status, 201, await block.clone().text());
  const availability = await api(`/api/availability?venueId=periyar&from=${date}&to=${date}`).then((response) => response.json());
  assert.ok(availability.data.every((row: { status: string }) => row.status === "BLOCKED"));
  assert.equal((await api("/api/booking/hold", "POST", { ...baseBooking, date })).status, 409);

  const key = randomBytes(16).toString("hex");
  const expiryDate = future(7);
  const options = { "Idempotency-Key": key };
  const first = await api("/api/booking/hold", "POST", { ...baseBooking, date: expiryDate }, undefined, options).then((response) => response.json());
  const replay = await api("/api/booking/hold", "POST", { ...baseBooking, date: expiryDate }, undefined, options).then((response) => response.json());
  assert.equal(first.reference, replay.reference);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    await pool.query(
      `UPDATE vijaya."Booking" SET "holdExpiresAt" = $2 WHERE "reference" = $1`,
      [first.reference, new Date(Date.now() - 1000)],
    );
    await assert.rejects(
      pool.query(
        `INSERT INTO vijaya."SlotState" ("id","spaceId","date","slot","startMinute","endMinute","status","updatedAt")
         VALUES ('test-conflict','periyar',$1,'DIRECT_TEST',1100,1150,'CONFIRMED',now())`,
        [baseBooking.date],
      ),
      (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === "23P01",
    );
    await assert.rejects(
      pool.query(
        `INSERT INTO vijaya."Booking"
        ("id", "reference", "spaceId", "spaceName", "eventType", "eventDate", "slot", "guests", "status",
         "customerName", "customerPhone", "customerEmail", "baseAmount", "totalPayable", "updatedAt")
        VALUES ('direct-booking-test','direct-booking-test','periyar','Periyar','WEDDING',$1,
          'EVENING',800,'CONFIRMED','Fixture','','fixture@example.test',0,0,now())`,
        [baseBooking.date],
      ),
      (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === "23P01",
    );
    const { rows: [expired] } = await pool.query<{ count: number }>(`SELECT vijaya.expire_holds() AS count`);
    assert.equal(expired?.count, 1);
  } finally {
    await pool.end();
  }
  assert.equal((await api("/api/internal/expire-holds", "POST", undefined, undefined, { authorization: `Bearer ${cron}` })).status, 200);
  const replacementHold = await api("/api/booking/hold", "POST", { ...baseBooking, date: expiryDate });
  assert.equal(replacementHold.status, 200);
  const { reference: offlineRef } = await replacementHold.json();
  const offlineReply = await api("/api/booking/checkout", "POST", { reference: offlineRef, ...manual.customer, acceptTerms: true });
  assert.equal(offlineReply.status, 200, await offlineReply.clone().text());
  assert.equal((await offlineReply.json()).status, "PENDING_APPROVAL");
  assert.equal((await api("/api/payment/initiate", "POST", { reference: offlineRef })).status, 403);
  assert.equal((await api("/book/sandbox-gateway")).status, 404);
  assert.equal((await api("/api/booking/hold", "POST", { ...baseBooking, date: expiryDate })).status, 409);
  const offlineAdmin = "/api/admin/bookings/" + offlineRef;
  assert.equal((await api(offlineAdmin, "PATCH", { action: "CONFIRM" }, admin)).status, 200);
  const confirmedOffline = await api(offlineAdmin, "GET", undefined, admin).then((reply) => reply.json());
  assert.equal(confirmedOffline.data.status, "CONFIRMED");
  assert.equal(confirmedOffline.data.payments.length, 0);

  const saveKeys = { action: "SAVE_TEST_KEYS", provider: "STRIPE", keyId: "pk_test_UnitOnly", secret: "sk_test_UnitOnly", webhookSecret: "unit-test-fixture" };
  assert.equal((await api("/api/admin/gateways", "POST", saveKeys, admin)).status, 200);
  const gatewaySettings = await api("/api/admin/gateways", "GET", undefined, admin).then((reply) => reply.text());
  assert.doesNotMatch(gatewaySettings, /sk_test_UnitOnly|unit-test-fixture|pk_test_UnitOnly/);
  assert.equal((await api("/api/admin/gateways", "POST", { action: "SETTINGS", mode: "SANDBOX", provider: "RAZORPAY" }, admin)).status, 200);

  const sandboxHold = await api("/api/booking/hold", "POST", { ...baseBooking, date: future(8) });
  assert.equal(sandboxHold.status, 200);
  const { reference } = await sandboxHold.json();
  const readyToPay = await api("/api/booking/checkout", "POST", { reference, ...manual.customer, acceptTerms: true });
  assert.equal(readyToPay.status, 200);
  assert.equal((await readyToPay.json()).status, "PENDING_PAYMENT");
  const intent = await api("/api/payment/initiate", "POST", { reference }, undefined, { "Idempotency-Key": "checkout-test" });
  assert.equal(intent.status, 200, await intent.clone().text());
  const { providerRef } = await intent.json();
  assert.equal((await api("/api/payment/initiate", "POST", { reference }, undefined, { "Idempotency-Key": "checkout-test" }).then((response) => response.json())).providerRef, providerRef);
  const outcome = await api("/api/payment/webhook", "POST", { providerRef, outcome: "SUCCESS" });
  assert.equal(outcome.status, 200, await outcome.clone().text());
  assert.equal((await api("/api/booking/" + reference).then((response) => response.json())).status, "CONFIRMED");
  assert.equal((await api("/api/admin/booking-documents/" + reference + "?type=invoice", "GET", undefined, admin)).status, 200);

  const heading = "Standalone CMS publication check";
  const content = { key: "home.hero", locale: "en", action: "PUBLISH", payload: { heading } };
  assert.equal((await api("/api/admin/content", "POST", { ...content, action: "DRAFT" }, admin)).status, 200);
  assert.doesNotMatch(await api("/").then((response) => response.text()), new RegExp(heading));
  const preview = await api("/api/admin/preview?enabled=true", "POST", undefined, admin);
  assert.equal(preview.status, 200);
  assert.match(await api("/", "GET", undefined, admin + "; " + cookies(preview)).then((response) => response.text()), new RegExp(heading));
  const started = Date.now();
  assert.equal((await api("/api/admin/content", "POST", content, admin)).status, 200);
  assert.match(await api("/").then((response) => response.text()), new RegExp(heading));
  assert.ok(Date.now() - started < 5000, "Published hero took longer than five seconds.");
  assert.equal((await api("/api/admin/content", "POST", { ...content, action: "DELETE" }, admin)).status, 200);
  assert.doesNotMatch(await api("/").then((response) => response.text()), new RegExp(heading));

  const gallery = { key: "gallery.items", locale: "en", action: "PUBLISH", payload: [{ src: "/media/hero-dusk.jpg", alt: "Gallery publication verification", category: "Property" }] };
  assert.equal((await api("/api/admin/content", "POST", gallery, admin)).status, 200);
  assert.match(await api("/gallery").then((response) => response.text()), /Gallery publication verification/);
  assert.equal((await api("/api/admin/content", "POST", { ...gallery, action: "DELETE" }, admin)).status, 200);
  assert.doesNotMatch(await api("/gallery").then((response) => response.text()), /Gallery publication verification/);

  const publish = async (key: string, payload: unknown) => {
    const response = await api("/api/admin/content", "POST", { key, locale: "en", action: "PUBLISH", payload }, admin);
    assert.equal(response.status, 200, await response.clone().text());
  };
  await api("/spaces/periyar");
  await publish("venue.periyar", { shortDescription: "Live Periyar description verification" });
  assert.match(await api("/spaces/periyar").then((response) => response.text()), /Live Periyar description verification/);
  await publish("site.contact", { phone: "+91 469 123 4567" });
  assert.match(await api("/").then((response) => response.text()), /\+91 469 123 4567/);
  await publish("site.settings", { showVirtualTour: true });
  assert.match(await api("/").then((response) => response.text()), /href="\/360-tour"/);
  await publish("site.settings", { showVirtualTour: false });
  assert.doesNotMatch(await api("/").then((response) => response.text()), /<a[^>]*href="\/360-tour"/);

  for (let index = 0; index < 5; index++) assert.equal(await signIn(bootstrap), "");
  assert.equal(await signIn(newPassword), "");
});
