
import { getComponentCopy } from "@/lib/cms/read";
import { pageCopy, pageMetadata, siteContent } from "@/lib/content";
import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckYourDateWizard } from "@/components/booking/check-date-wizard";

const metadata: Metadata = {
  title: "Check Your Date",
  description:
    "Check live availability across VIJAYA's bookable spaces — choose your event type, date, slot and guests, then hold your date in minutes.",
};

export default async function CheckYourDatePage() {
  const [copy, settings] = await Promise.all([pageCopy("check-your-date"), siteContent("site.settings")]);
  return (
    <main className="min-h-screen">
      <section className="bg-burgundy text-ivory pt-28 md:pt-36 pb-10">
        <div className="container-editorial max-w-4xl">
          <p className="eyebrow">{copy("text.plan-with-confidence", "Plan With Confidence")}</p>
          <h1 className="h-display mt-3">{copy("text.check-your-date", "Check Your Date.")}</h1>
          <p className="lede !text-ivory/70 mt-4 max-w-2xl">{copy("text.live-availability-across-every-bookable-space-the", "Live availability across every bookable space — the same calendar the VIJAYA booking office uses. Nine steps, about three minutes, a real hold on your date.")}</p>
        </div>
      </section>
      <section className="py-12 md:py-16 bg-ivory">
        <Suspense fallback={<WizardSkeleton />}>
          <CheckYourDateWizard showVirtualTour={settings?.showVirtualTour} />
        </Suspense>
      </section>
    </main>
  );
}

async function WizardSkeleton() {
  const cmsCopy = await getComponentCopy("copy.app.site.check-your-date.page");
  return (
    <div className="container-editorial max-w-4xl">
      <div className="card-editorial p-10 text-center text-stone text-sm">{cmsCopy("text.preparing-the-booking-engine", "Preparing the booking engine…")}</div>
    </div>
  );
}

export const generateMetadata = () => pageMetadata("check-your-date", metadata);
