import { pageCopy, pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import { PolicyPage } from "@/components/layout/policy-page";

const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms governing the use of the VIJAYA website and booking platform.",
};

export default async function TermsPage() {
  const copy = await pageCopy("terms");
  return (
    <PolicyPage
      eyebrow={copy("eyebrow.legal", "Legal")}
      title={copy("title.terms-of-use", "Terms of Use")}
      crumb="Terms"
      updated="Provisional — pending VICC approval"
      image={copy("image.exp-architecture-jpg", "/media/exp-architecture.jpg")}
      intro={copy("intro.the-ground-rules-for-using-this-website-and-bookin", "The ground rules for using this website and booking platform.")}
      sections={[
        {
          heading: "1. The service",
          body: [
            "This website provides information about VIJAYA International Convention Centre and, where offered, the ability to check availability, place temporary holds and confirm bookings online. Availability and pricing are validated server-side; screenshots or cached pages do not constitute confirmation.",
          ],
        },
        {
          heading: "2. Bookings and payment",
          body: [
            "A booking becomes binding only upon server-verified payment and issuance of a booking reference. Temporary holds are not bookings and expire automatically. Until the production payment gateway is enabled, checkout operates in sandbox mode and no real charge is made.",
            "Provisional figures marked as sample or indicative (capacities, rates, taxes) are replaced by verified figures once approved by VICC management; the terms of your signed agreement take precedence in any conflict.",
          ],
        },
        {
          heading: "3. Acceptable use",
          body: [
            "You agree not to disrupt the platform, attempt unauthorised access, scrape content at scale or misuse availability features. Holds created without intent to book may be released by operations.",
          ],
        },
        {
          heading: "4. Content and media",
          body: [
            "Site content, brand assets and imagery are owned by VIJAYA or their respective owners. Placeholder media is marked as such and will be replaced by official VIJAYA photography; it does not depict specific real events.",
          ],
        },
        {
          heading: "5. Liability",
          body: [
            "The website is provided with reasonable care but without warranty of uninterrupted availability. Nothing in these terms limits liability that cannot be limited under applicable law.",
          ],
        },
      ]}
    />
  );
}

export const generateMetadata = () => pageMetadata("terms", metadata);
