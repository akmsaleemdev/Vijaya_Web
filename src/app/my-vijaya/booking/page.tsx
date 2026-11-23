import { totalContract } from "@/lib/booking/amounts";
import { pageMetadata } from "@/lib/content";

import { getComponentCopy } from "@/lib/cms/read";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalSession, getPortalBookings } from "@/lib/portal-auth";
import { inr } from "@/lib/pricing";
import { SLOTS } from "@/lib/site-config";

const metadata: Metadata = { title: "Portal — Booking" };

export default async function PortalBookingPage() {
  const cmsCopy = await getComponentCopy("copy.app.my-vijaya.booking.page");
  const session = await getPortalSession();
  if (!session) redirect("/my-vijaya");
  const bookings = await getPortalBookings(session.email);

  return (
    <main className="py-12 md:py-16">
      <div className="container-editorial">
        <p className="eyebrow-dark">{cmsCopy("text.booking", "Booking")}</p>
        <h1 className="h-section mt-3">{cmsCopy("text.your-reservation", "Your Reservation")}{bookings.length > 1 ? "s" : ""}</h1>

        {bookings.length === 0 ? (
          <p className="lede mt-6">{cmsCopy("text.no-active-bookings-were-found-on-your-account", "No active bookings were found on your account.")}</p>
        ) : (
          <div className="mt-10 space-y-6">
            {bookings.map((b) => {
              const slot = SLOTS.find((s) => s.id === b.slot);
              return (
                <article key={b.id} className="card-editorial p-6 md:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[13px] tracking-[0.1em] text-burgundy">{b.reference}</p>
                      <h2 className="mt-1 text-xl font-light">{b.spaceName}</h2>
                    </div>
                    <span className={`chip ${b.status === "CONFIRMED" ? "!text-available !border-available/40" : "!text-burgundy !border-burgundy/40"}`}>
                      {b.status === "CONFIRMED" ? "Confirmed" : b.status === "PENDING_PAYMENT" ? "Payment pending" : b.status}
                    </span>
                  </div>
                  <dl className="mt-6 grid gap-4 sm:grid-cols-3 text-[13px]">
                    <div>
                      <dt className="label-vij !mb-1">{cmsCopy("text.event-type", "Event Type")}</dt>
                      <dd className="font-light">{b.eventType.charAt(0) + b.eventType.slice(1).toLowerCase()}</dd>
                    </div>
                    <div>
                      <dt className="label-vij !mb-1">{cmsCopy("text.date", "Date")}</dt>
                      <dd className="font-light">{new Date(b.eventDate + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</dd>
                    </div>
                    <div>
                      <dt className="label-vij !mb-1">{cmsCopy("text.slot", "Slot")}</dt>
                      <dd className="font-light">{slot ? `${slot.label} — ${slot.time}` : b.slot}</dd>
                    </div>
                    <div>
                      <dt className="label-vij !mb-1">{cmsCopy("text.guest-estimate", "Guest Estimate")}</dt>
                      <dd className="font-light">{b.guests}{cmsCopy("text.guests", " guests")}</dd>
                    </div>
                    <div>
                      <dt className="label-vij !mb-1">{cmsCopy("text.total-contract-sample", "Total Contract (sample)")}</dt>
                      <dd className="font-light">{inr(totalContract(b))}</dd>
                    </div>
                    <div>
                      <dt className="label-vij !mb-1">{cmsCopy("text.add-ons", "Add-ons")}</dt>
                      <dd className="font-light text-stone">{cmsCopy("text.arranged-with-your-event-manager", "Arranged with your event manager")}</dd>
                    </div>
                  </dl>
                  {b.notes && (
                    <p className="mt-5 border-l-2 border-gold/60 pl-4 text-[13px] font-light leading-6 text-stone">{b.notes}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("my-vijaya.booking", metadata);
