import type { Metadata } from "next";
import { PolicyPage } from "@/components/layout/policy-page";

export const metadata: Metadata = {
  title: "Booking Policy",
  description: "How booking, holds, payments and confirmations work at VIJAYA International Convention Centre.",
};

export default function BookingPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Policies"
      title="Booking Policy"
      crumb="Booking Policy"
      updated="Provisional — pending VICC approval"
      image="/media/space-nila.jpg"
      intro="One calendar, two doors — online and offline bookings stay synchronised so a date can never be promised twice."
      sections={[
        {
          heading: "1. Checking availability",
          body: [
            "Availability on this website is validated server-side and reflects the same calendar used by the VIJAYA booking office. A space shown as available can be placed on hold immediately; a space booked offline becomes unavailable online the moment the booking office records it.",
            "Indicative guest ranges shown on space pages are provisional until verified master data is approved by VICC management.",
          ],
        },
        {
          heading: "2. Temporary holds",
          body: [
            "When you begin checkout, your selected space, date and slot are placed under a temporary hold for a short, configurable window — 10 minutes in this build. The hold is yours alone: no other customer can book it while it lasts.",
            "If payment is not completed within the window, the hold expires automatically and the slot returns to available. We will always show a clear countdown while your hold is active.",
          ],
        },
        {
          heading: "3. Payment and confirmation",
          body: [
            "A booking is confirmed only after payment verification on our secure server — never from a browser redirect alone. Your booking reference, receipt and confirmation letter are issued immediately after confirmation and become available in My VIJAYA.",
            "A token amount confirms the booking; the balance follows the schedule shown in the portal. All taxes and mandatory charges are displayed before you pay — there are no hidden additions at checkout.",
            "Payment gateway integration is being finalised with VICC; until then the checkout runs in sandbox demonstration mode and no real charge is made.",
          ],
        },
        {
          heading: "4. Space combinations",
          body: [
            "Some halls can function independently or in combination (for example, Nila + Pamba). When a combined configuration is booked, both halls are blocked; when either hall is booked separately, the combined configuration is automatically unavailable.",
          ],
        },
        {
          heading: "5. Changes and special requirements",
          body: [
            "Requests to change dates, slots or spaces are handled by the VIJAYA events team and are subject to availability. Adjustments to layouts, additional hours and add-ons can be arranged through the events team or the My VIJAYA portal.",
          ],
        },
      ]}
    />
  );
}
