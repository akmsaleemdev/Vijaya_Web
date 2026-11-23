import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckYourDateWizard } from "@/components/booking/check-date-wizard";

export const metadata: Metadata = {
  title: "Check Your Date",
  description:
    "Check live availability across VIJAYA's bookable spaces — choose your event type, date, slot and guests, then hold your date in minutes.",
};

export default function CheckYourDatePage() {
  return (
    <main className="min-h-screen">
      <section className="bg-burgundy text-ivory pt-28 md:pt-36 pb-10">
        <div className="container-editorial max-w-4xl">
          <p className="eyebrow">Plan With Confidence</p>
          <h1 className="h-display mt-3">Check Your Date.</h1>
          <p className="lede !text-ivory/70 mt-4 max-w-2xl">
            Live availability across every bookable space — the same calendar the VIJAYA booking office uses. Nine
            steps, about three minutes, a real hold on your date.
          </p>
        </div>
      </section>
      <section className="py-12 md:py-16 bg-ivory">
        <Suspense fallback={<WizardSkeleton />}>
          <CheckYourDateWizard />
        </Suspense>
      </section>
    </main>
  );
}

function WizardSkeleton() {
  return (
    <div className="container-editorial max-w-4xl">
      <div className="card-editorial p-10 text-center text-stone text-sm">Preparing the booking engine…</div>
    </div>
  );
}
