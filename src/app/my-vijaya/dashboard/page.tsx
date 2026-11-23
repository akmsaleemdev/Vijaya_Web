import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Wallet, UserCheck, Flag, BadgeCheck } from "lucide-react";
import { getPortalSession, getPortalBookings } from "@/lib/portal-auth";
import { inr } from "@/lib/pricing";
import { SLOTS } from "@/lib/site-config";

export const metadata: Metadata = { title: "Portal — Overview" };

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect("/my-vijaya");
  const bookings = await getPortalBookings(session.email);
  const b = bookings[0];

  if (!b) {
    return (
      <main className="py-16">
        <div className="container-editorial max-w-xl text-center">
          <h1 className="h-section">Welcome to My VIJAYA</h1>
          <p className="lede mt-4">No active booking was found on your account yet.</p>
        </div>
      </main>
    );
  }

  const paid = b.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0);
  const totalContract = b.baseAmount + b.weekendUplift + b.taxAmount;
  const balance = Math.max(0, totalContract - paid);
  const nextMilestone = b.milestones.find((m) => m.status !== "DONE");
  const slotLabel = SLOTS.find((s) => s.id === b.slot)?.label || b.slot;

  const widgets = [
    { icon: CalendarDays, label: "Event Date", value: new Date(b.eventDate + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) },
    { icon: MapPin, label: "Venue", value: `${b.spaceName} · ${slotLabel}` },
    { icon: BadgeCheck, label: "Booking Status", value: b.status === "CONFIRMED" ? "Confirmed" : b.status === "PENDING_PAYMENT" ? "Payment pending" : b.status },
    { icon: Wallet, label: "Payment Progress", value: `${inr(paid)} paid · ${inr(balance)} balance` },
    { icon: Flag, label: "Next Milestone", value: nextMilestone ? `${nextMilestone.title} — ${nextMilestone.dueDate}` : "All milestones complete" },
    { icon: UserCheck, label: "Event Manager", value: "VIJAYA Events Desk (assigned at 60-day mark)" },
  ];

  return (
    <main className="py-12 md:py-16">
      <div className="container-editorial">
        <p className="eyebrow-dark">Overview</p>
        <h1 className="h-section mt-3">Hello, {b.customerName.split(" ")[0]}.</h1>
        <p className="lede mt-3 max-w-2xl text-[14px]">
          Everything about your {b.spaceName} booking in one calm place. Reference{" "}
          <span className="font-mono text-burgundy">{b.reference}</span>.
          {b.crmSync === "QUEUED" && (
            <span className="ml-2 text-[12px] text-stone">(CRM sync queued — updates flow to the CRM when it connects.)</span>
          )}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <div key={w.label} className="card-editorial p-6">
              <w.icon className="h-5 w-5 text-gold" aria-hidden />
              <p className="mt-4 label-vij !mb-1.5">{w.label}</p>
              <p className="text-[15px] font-light leading-7">{w.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 card-editorial p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium uppercase tracking-[0.16em]">Payment progress</p>
            <p className="text-[12px] text-stone">{totalContract > 0 ? Math.round((paid / totalContract) * 100) : 0}%</p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-burgundy rounded-full" style={{ width: `${totalContract > 0 ? Math.min(100, Math.round((paid / totalContract) * 100)) : 0}%` }} />
          </div>
          <p className="mt-3 text-[12px] text-stone">
            {inr(paid)} of {inr(totalContract)} · balance {inr(balance)} due per your payment schedule.
          </p>
        </div>
      </div>
    </main>
  );
}
