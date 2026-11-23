import { pageMetadata } from "@/lib/content";

import { getComponentCopy } from "@/lib/cms/read";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { getPortalSession, getPortalBookings } from "@/lib/portal-auth";
import { SITE } from "@/lib/site-config";
import { SupportForm } from "@/components/portal/support-form";

const metadata: Metadata = { title: "Portal — Support" };

export default async function PortalSupportPage() {
  const cmsCopy = await getComponentCopy("copy.app.my-vijaya.support.page");
  const session = await getPortalSession();
  if (!session) redirect("/my-vijaya");
  const bookings = await getPortalBookings(session.email);
  const b = bookings[0];

  return (
    <main className="py-12 md:py-16">
      <div className="container-editorial grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="eyebrow-dark">{cmsCopy("text.support", "Support")}</p>
          <h1 className="h-section mt-3">{cmsCopy("text.we-re-a-message-away", "We're a Message Away.")}</h1>
          <div className="mt-8 space-y-6">
            <div className="hairline-t pt-5">
              <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                <UserIcon />{cmsCopy("text.event-manager", " Event Manager")}</h2>
              <p className="mt-3 text-[14px] font-light text-stone leading-7">{cmsCopy("text.vijaya-events-desk-assigned-to", "VIJAYA Events Desk — assigned to ")}{b ? b.reference : "your booking"}{cmsCopy("text.your-dedicated-manager-is-introduced-at-the-6", ". Your dedicated manager is introduced at the 60-day milestone and stays with you to the event day.")}</p>
            </div>
            <div className="hairline-t pt-5">
              <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                <Phone className="h-4 w-4 text-gold" />{cmsCopy("text.phone", " Phone")}</h2>
              <p className="mt-3 text-[14px] font-light text-stone">{SITE.contact.phone} <span className="text-[11px] text-stone/60">{cmsCopy("text.placeholder", "(placeholder)")}</span></p>
            </div>
            <div className="hairline-t pt-5">
              <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                <Mail className="h-4 w-4 text-gold" />{cmsCopy("text.email", " Email")}</h2>
              <p className="mt-3 text-[14px] font-light text-stone">{SITE.contact.email}</p>
            </div>
            <div className="hairline-t pt-5">
              <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                <MessageCircle className="h-4 w-4 text-gold" />{cmsCopy("text.whatsapp", " WhatsApp")}</h2>
              <p className="mt-3 text-[14px] font-light text-stone">{cmsCopy("text.enabled-once-the-whatsapp-business-integratio", "Enabled once the WhatsApp Business integration is approved.")}</p>
            </div>
          </div>
        </div>
        <SupportForm />
      </div>
    </main>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

export const generateMetadata = () => pageMetadata("my-vijaya.support", metadata);
