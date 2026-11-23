import { pageCopy, pageMetadata, siteContent } from "@/lib/content";
import type { Metadata } from "next";
import { Globe2, MonitorPlay, FileCheck2, CreditCard, CalendarCheck, Video, Users, Handshake, Video as VideoIcon, FileText } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, MaskReveal } from "@/components/motion/reveal";
import { Media } from "@/components/media/media";
import { GlobalDeskForm } from "@/components/forms/global-desk-form";
import { SHOW_VIRTUAL_TOUR } from "@/lib/site-config";

const metadata: Metadata = {
  title: "VIJAYA Global Desk",
  description: SHOW_VIRTUAL_TOUR
    ? "Plan from abroad, celebrate in Kerala. Remote date checking, virtual consultations, 360° tours, digital documentation and online payment for NRI families across the GCC."
    : "Plan from abroad, celebrate in Kerala. Remote date checking, virtual consultations, digital documentation and online payment for NRI families across the GCC.",
};

const MARKETS = ["UAE", "Qatar", "Oman", "Saudi Arabia", "Kuwait", "Bahrain"];

const FEATURES = [
  { icon: Video, title: "360° Venue Tour", copy: "Walk the halls and lakeside from your living room." },
  { icon: MonitorPlay, title: "Virtual Consultation", copy: "Video planning sessions with the VIJAYA events team." },
  { icon: CalendarCheck, title: "Remote Date Checking", copy: "Live availability, checked in real time." },
  { icon: Globe2, title: "Remote Booking", copy: "Hold, confirm and manage your booking from abroad." },
  { icon: FileText, title: "Digital Documentation", copy: "Agreements, invoices and receipts in your portal." },
  { icon: VideoIcon, title: "Video Walkthrough", copy: "Guided walkthroughs recorded for your family." },
  { icon: Users, title: "Remote Family Consultation", copy: "Everyone joins, wherever they are." },
  { icon: CreditCard, title: "Online Payment", copy: "Secure payments with clear receipts." },
  { icon: Handshake, title: "Vendor Coordination", copy: "Florists, photographers and caterers — aligned with the venue." },
].filter((f) => SHOW_VIRTUAL_TOUR || f.title !== "360° Venue Tour");

export default async function GlobalDeskPage() {
  const showVirtualTour = (await siteContent("site.settings"))?.showVirtualTour ?? SHOW_VIRTUAL_TOUR;
  const copy = await pageCopy("global-desk");
  return (
    <main>
      <PageHero
        eyebrow={copy("eyebrow.vijaya-global-desk", "VIJAYA Global Desk")}
        title={copy("title.plan-from-abroad-celebrate-in-kerala", "Plan From Abroad. Celebrate in Kerala.")}
        intro={copy("intro.a-dedicated-desk-for-nri-families-across-the-gcc-e", "A dedicated desk for NRI families across the GCC — every step of planning possible remotely, with the warmth of a homecoming when you arrive.")}
        image={copy("image.story-1-jpg", "/media/story-1.jpg")}
        ctas={[
          { label: "Check Your Date", href: "/check-your-date" },
          { label: "Schedule Virtual Consultation", href: "#consult", variant: "ghost" },
        ]}
      />

      <section className="py-20 md:py-28">
        <div className="container-editorial">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.where-our-families-are", "Where Our Families Are")}</p>
            <h2 className="h-section mt-3">{copy("text.serving-the-gcc-corridor", "Serving the GCC Corridor")}</h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border">
            {MARKETS.map((m, i) => (
              <Reveal key={m} delay={i * 0.04} className="bg-ivory">
                <div className="py-8 text-center">
                  <p className="text-[15px] font-medium">{m}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gold">{copy("text.desk-active", "Desk active")}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="card-editorial p-7 h-full">
                  <f.icon className="h-5 w-5 text-gold" aria-hidden />
                  <h3 className="mt-4 text-[15px] font-medium">{f.title}</h3>
                  <p className="mt-2 text-[13px] font-light leading-6 text-stone">{f.copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-burgundy text-ivory py-20 md:py-28">
        <div className="container-editorial grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow">{copy("text.the-journey", "The Journey")}</p>
            <h2 className="h-section mt-3">{copy("text.from-dubai-to-thiruvalla-without-the-stress", "From Dubai to Thiruvalla, Without the Stress.")}</h2>
            <ol className="mt-8 space-y-5">
              {[
                showVirtualTour ? "Tour the destination in 360° and shortlist your spaces." : "Shortlist your spaces and the halls that fit your occasion.",
                "Check your date live and place a temporary hold.",
                "Meet the events team on a video consultation.",
                "Confirm with secure online payment and instant documentation.",
                "Coordinate vendors remotely through the Global Desk.",
                "Arrive home to a venue that already knows your family.",
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="text-gold text-[13px] font-medium pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-[14px] font-light leading-7 text-ivory/85">{step}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <MaskReveal className="relative aspect-[4/5]">
            <Media src={copy("src.hero-wedding-jpg", "/media/hero-wedding.jpg")} alt={copy("alt.kerala-wedding-setting-placeholder-visual", "Kerala wedding setting — placeholder visual")} sizes="(max-width: 1024px) 100vw, 50vw" />
          </MaskReveal>
        </div>
      </section>

      <section id="consult" className="py-20 md:py-28 scroll-mt-20">
        <div className="container-editorial max-w-3xl">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.global-desk-enquiry", "Global Desk Enquiry")}</p>
            <h2 className="h-section mt-3">{copy("text.schedule-a-virtual-consultation", "Schedule a Virtual Consultation")}</h2>
            <p className="lede mt-4">{copy("text.tell-us-where-you-are-and-what-you-re-planning-the", "Tell us where you are and what you're planning — the Global Desk responds within one working day.")}</p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <GlobalDeskForm />
          </Reveal>
        </div>
      </section>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("global-desk", metadata);
