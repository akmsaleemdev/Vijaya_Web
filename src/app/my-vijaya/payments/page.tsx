import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPortalSession, getPortalBookings } from "@/lib/portal-auth";
import { inr } from "@/lib/pricing";
import { PayNowButton } from "@/components/portal/pay-now-button";

export const metadata: Metadata = { title: "Portal — Payments" };

export default async function PortalPaymentsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/my-vijaya");
  const bookings = await getPortalBookings(session.email);
  const b = bookings[0];

  if (!b) {
    return (
      <main className="py-16">
        <div className="container-editorial max-w-xl text-center">
          <h1 className="h-section">Payments</h1>
          <p className="lede mt-4">No active booking found on your account.</p>
        </div>
      </main>
    );
  }

  const totalContract = b.baseAmount + b.weekendUplift + b.taxAmount;
  const paid = b.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, totalContract - paid);
  const eventDate = new Date(b.eventDate + "T00:00:00Z");
  const schedule = [
    { label: "Token / deposit (paid at booking)", amount: b.depositAmount + Math.round(b.depositAmount * 0.12), due: "At confirmation" },
    { label: "Second instalment", amount: Math.round(totalContract * 0.35), due: new Date(eventDate.getTime() - 60 * 86400000).toISOString().slice(0, 10) },
    { label: "Final balance", amount: 0, due: new Date(eventDate.getTime() - 15 * 86400000).toISOString().slice(0, 10) },
  ];
  // Final balance = remainder after deposit + instalment
  schedule[2].amount = Math.max(0, totalContract - schedule[0].amount - schedule[1].amount);

  return (
    <main className="py-12 md:py-16">
      <div className="container-editorial">
        <p className="eyebrow-dark">Payments</p>
        <h1 className="h-section mt-3">Amounts, Schedule &amp; Receipts</h1>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="card-editorial p-6">
            <p className="label-vij">Contract total (sample)</p>
            <p className="text-2xl font-light mt-1">{inr(totalContract)}</p>
          </div>
          <div className="card-editorial p-6">
            <p className="label-vij">Paid</p>
            <p className="text-2xl font-light mt-1 text-available">{inr(paid)}</p>
          </div>
          <div className="card-editorial p-6">
            <p className="label-vij">Balance</p>
            <p className="text-2xl font-light mt-1">{inr(balance)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section className="card-editorial p-6 md:p-8">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.16em]">Payment Schedule</h2>
            <ul className="mt-5 divide-y divide-border">
              {schedule.map((s) => (
                <li key={s.label} className="py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-light">{s.label}</p>
                    <p className="text-[12px] text-stone mt-0.5">Due: {s.due}</p>
                  </div>
                  <p className="text-[14px] font-light whitespace-nowrap">{inr(s.amount)}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-5 text-stone/80">
              Schedule shown is a sample structure pending the signed agreement. Taxes and mandatory charges are always
              displayed before any payment.
            </p>
            {balance > 0 && <PayNowButton amount={balance} label={`Pay ${inr(balance)} towards balance`} />}
          </section>

          <section className="card-editorial p-6 md:p-8">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.16em]">Transactions</h2>
            {b.payments.length === 0 ? (
              <p className="mt-5 text-[13px] text-stone">No transactions yet.</p>
            ) : (
              <ul className="mt-5 divide-y divide-border">
                {b.payments.map((p) => (
                  <li key={p.id} className="py-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[12px]">{p.providerRef}</p>
                      <p className="text-[12px] text-stone mt-0.5">
                        {p.method || "sandbox"} · {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {p.transactionId ? ` · ${p.transactionId}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-light">{inr(p.amount)}</p>
                      <p className={`text-[11px] uppercase tracking-[0.14em] ${p.status === "SUCCESS" ? "text-available" : p.status === "FAILED" ? "text-destructive" : "text-stone"}`}>{p.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
