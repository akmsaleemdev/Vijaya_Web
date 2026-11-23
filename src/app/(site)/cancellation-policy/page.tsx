import { pageCopy, pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import { PolicyPage } from "@/components/layout/policy-page";

const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "Cancellation terms and refund framework for bookings at VIJAYA International Convention Centre.",
};

export default async function CancellationPolicyPage() {
  const copy = await pageCopy("cancellation-policy");
  return (
    <PolicyPage
      eyebrow={copy("eyebrow.policies", "Policies")}
      title={copy("title.cancellation-policy", "Cancellation Policy")}
      crumb="Cancellation Policy"
      updated="Provisional — pending VICC approval"
      image={copy("image.space-pamba-jpg", "/media/space-pamba.jpg")}
      intro={copy("intro.life-moves-when-plans-change-this-policy-keeps-the", "Life moves. When plans change, this policy keeps the process calm, transparent and fair to both sides.")}
      sections={[
        {
          heading: "1. How to cancel",
          body: [
            "Cancellations can be requested from the My VIJAYA portal or directly with the VIJAYA events team. Your cancellation is effective from the date of the written request, and the venue team will acknowledge it promptly.",
          ],
        },
        {
          heading: "2. Refund framework",
          body: [
            "The refund framework depends on how far before the event date the cancellation is made. Exact sliding-scale terms (token refundability, notice periods and applicable deductions) are being finalised by VICC management and will be published here before production launch.",
            "Until then, the terms stated in your signed booking agreement take precedence over any general indication on this page.",
          ],
        },
        {
          heading: "3. Cancellation by the venue",
          body: [
            "In the rare event that VIJAYA must cancel a confirmed booking (for reasons within its control), customers receive a full refund of amounts paid and, where practicable, priority assistance in rebooking alternative dates.",
          ],
        },
        {
          heading: "4. Released dates",
          body: [
            "When a cancellation is confirmed under the applicable terms, the affected date and slot are released back to general availability — online and offline — at the same moment, through the same synchronised calendar.",
          ],
        },
      ]}
    />
  );
}

export const generateMetadata = () => pageMetadata("cancellation-policy", metadata);
