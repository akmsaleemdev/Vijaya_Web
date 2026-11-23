import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { getPortalSession, getPortalBookings } from "@/lib/portal-auth";

export const metadata: Metadata = { title: "Portal — Event Plan" };

export default async function PortalEventPlanPage() {
  const session = await getPortalSession();
  if (!session) redirect("/my-vijaya");
  const bookings = await getPortalBookings(session.email);
  const b = bookings[0];

  return (
    <main className="py-12 md:py-16">
      <div className="container-editorial">
        <p className="eyebrow-dark">Event Plan</p>
        <h1 className="h-section mt-3">Milestones &amp; Timeline.</h1>

        {!b ? (
          <p className="lede mt-6">No active booking found on your account.</p>
        ) : (
          <>
            <div className="mt-10 max-w-2xl">
              <ol className="relative border-l border-border ml-3">
                {b.milestones.map((m) => {
                  const done = m.status === "DONE";
                  return (
                    <li key={m.id} className="ml-6 pb-8 last:pb-0">
                      <span className="absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full bg-ivory">
                        {done ? (
                          <CheckCircle2 className="h-6 w-6 text-available" aria-label="Complete" />
                        ) : (
                          <Circle className="h-6 w-6 text-gold" aria-label="Upcoming" />
                        )}
                      </span>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className={`text-[15px] font-medium ${done ? "text-stone" : ""}`}>{m.title}</h2>
                        <span className="text-[12px] text-stone">{m.dueDate}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] font-light leading-6 text-stone">{m.detail}</p>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <div className="card-editorial p-6">
                <h3 className="text-[13px] font-medium uppercase tracking-[0.16em]">Setup Notes</h3>
                <p className="mt-3 text-[13px] font-light leading-6 text-stone">
                  Shared with decorators and vendors after the layout is finalised (15-day milestone).
                </p>
              </div>
              <div className="card-editorial p-6">
                <h3 className="text-[13px] font-medium uppercase tracking-[0.16em]">Vendor Notes</h3>
                <p className="mt-3 text-[13px] font-light leading-6 text-stone">
                  Vendor list, arrival windows and service-corridor access are coordinated by your event manager.
                </p>
              </div>
              <div className="card-editorial p-6">
                <h3 className="text-[13px] font-medium uppercase tracking-[0.16em]">Event Documents</h3>
                <p className="mt-3 text-[13px] font-light leading-6 text-stone">
                  Run sheets and day plans appear here as the event approaches.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
