import type { Metadata } from "next";
import { PolicyPage } from "@/components/layout/policy-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How VIJAYA International Convention Centre collects, uses and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Privacy Notice"
      crumb="Privacy"
      updated="Provisional — pending VICC approval"
      image="/media/exp-landscape.jpg"
      intro="Your occasion is personal — so is your data. This notice explains what we collect, why, and the controls you have."
      sections={[
        {
          heading: "1. What we collect",
          body: [
            "Enquiry and booking data you provide directly: name, phone, email, country, event details, guest counts and notes. Payment transactions are processed by our payment gateway; we store only transaction references and status — never card details.",
            "Usage analytics such as page views and booking-funnel steps are recorded in aggregate to improve the experience. Analytics records are not used to build advertising profiles.",
          ],
        },
        {
          heading: "2. How we use it",
          body: [
            "To respond to enquiries, manage bookings, process payments, coordinate your event and provide the My VIJAYA portal. Enquiries carry source and campaign information so the right team responds with context.",
            "We do not sell your personal data. Data is shared only with service providers essential to the above — CRM, payment processing, communication channels (email; WhatsApp only where approved) — under confidentiality obligations.",
          ],
        },
        {
          heading: "3. Retention and security",
          body: [
            "Booking records are retained as required for commercial and legal purposes; enquiry data is retained while a booking relationship is active or anticipated. Access to booking systems is role-based, logged and audited.",
            "Transport is encrypted; payment secrets never touch our servers; payment callbacks are verified server-side with idempotency protection.",
          ],
        },
        {
          heading: "4. Your rights",
          body: [
            "You may request access, correction or deletion of your personal data, and object to specific processing, by contacting our team. We respond within a reasonable period and applicable law.",
          ],
        },
      ]}
    />
  );
}
