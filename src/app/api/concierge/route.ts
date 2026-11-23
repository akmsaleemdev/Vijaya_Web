import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/availability";
import { inr } from "@/lib/pricing";
import { SPACES, SPACE_BY_SLUG } from "@/lib/data/spaces";
import { siteContent } from "@/lib/content";
import { SLOTS, type SlotId, SHOW_VIRTUAL_TOUR } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * POST /api/concierge — VIJAYA Event Concierge.
 *
 * RULES (from the spec): never invent price, availability or capacity.
 * - Capacity answers use only the (provisional) master data and say so.
 * - Availability answers always come from the server-side engine.
 * - Pricing always comes from the booking system (sample-flagged).
 * A deterministic knowledge-base concierge guarantees those rules hold.
 */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function findSpace(text: string) {
  const t = text.toLowerCase();
  return SPACES.find((s) => t.includes(s.officialName.toLowerCase()) || t.includes(s.slug.replace("-", " ")));
}

export async function POST(req: Request) {
  try {
    const showVirtualTour = (await siteContent("site.settings"))?.showVirtualTour ?? SHOW_VIRTUAL_TOUR;
    const { message } = await req.json();
    const text: string = String(message || "").slice(0, 500);
    const t = text.toLowerCase();
    let reply: string;
    let suggestions: string[] = [];
    let action: { label: string; href: string } | null = null;

    // Availability intent
    const dateMatch = t.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch || (t.includes("availab") && !t.includes("unavailab"))) {
      const date = dateMatch ? dateMatch[1] : null;
      if (date) {
        const slot: SlotId = t.includes("morning") ? "MORNING" : t.includes("afternoon") ? "AFTERNOON" : t.includes("full day") ? "FULL_DAY" : "EVENING";
        const guestMatch = t.match(/(\d{2,5})\s*(guests|people|pax|persons)/);
        const guests = guestMatch ? parseInt(guestMatch[1], 10) : 300;
        const { spaces } = await checkAvailability({ date, slot, guests });
        const free = spaces.filter((s) => s.available);
        if (free.length > 0) {
          reply = `For ${date} (${SLOTS.find((s) => s.id === slot)?.label} slot, ~${guests} guests), I can see ${free.length} matching option${free.length > 1 ? "s" : ""}: ${free.slice(0, 3).map((s) => s.name).join(", ")}. Availability is verified live against the VIJAYA calendar.`;
          action = { label: "Continue to booking", href: `/check-your-date?eventType=WEDDING&date=${date}&slot=${slot}&guests=${guests}&auto=1` };
        } else {
          reply = `I'm afraid everything compatible with ${guests} guests is already booked or held for ${date} (${SLOTS.find((s) => s.id === slot)?.label}). Nearby dates may be free — shall I take you to Check Your Date to compare?`;
          action = { label: "Check nearby dates", href: `/check-your-date?eventType=WEDDING&date=${date}&slot=${slot}&guests=${guests}` };
        }
      } else {
        reply = "I can check live availability for you. Share a date (for example 2026-01-24), and optionally the slot and guest count — I'll look it up in the booking engine right away.";
        suggestions = ["2026-01-24 evening for 400 guests", "What slots are there?", "Wedding dates in March"];
      }
    } else if (t.includes("price") || t.includes("cost") || t.includes("rate") || t.includes("how much")) {
      const space = findSpace(text);
      if (space && space.pricing.EVENING) {
        reply = `${space.officialName} indicative evening rate is ${inr(space.pricing.EVENING)} (sample pricing pending VIJAYA approval). Taxes, deposits and seasonal rules are confirmed at quotation — the exact total appears before you pay.`;
        suggestions = [`Is ${space.officialName} available on 2026-02-14?`, "Show me all spaces", "Book a venue visit"];
      } else {
        reply = "Rates are indicative until VICC approves the final price list. For example, Periyar's sample evening rate is " + inr(SPACE_BY_SLUG["periyar"].pricing.EVENING || 0) + ". Your exact total — including taxes and deposit — is always shown before payment.";
        action = { label: "See sample rates", href: "/spaces" };
      }
    } else if (t.includes("capacity") || t.includes("guest") || t.includes("how many people")) {
      const space = findSpace(text);
      if (space?.guestRange) {
        reply = `${space.officialName} has an indicative range of ${space.guestRange[0]}–${space.guestRange[1]} guests. This is provisional — verified capacities are published once VICC approves the master data.`;
      } else {
        reply = "Capacities are currently indicative and clearly marked pending verification. Tell me your expected guest count and I'll match you with suitable spaces — for example '600 guests'.";
        suggestions = ["600 guests", "150 guests", "2500 guests"];
      }
    } else if (t.includes("wedding") || t.includes("marriage") || t.includes("mandap")) {
      reply = "Weddings are VIJAYA's heart — grand halls, lakeside ceremonies, green rooms and a team that choreographs the whole day. For planning from abroad, the VIJAYA Global Desk covers virtual tours and remote booking.";
      suggestions = ["Check wedding dates", "Show wedding spaces", "Plan from the GCC"];
      action = { label: "Explore weddings", href: "/weddings" };
    } else if (t.includes("conference") || t.includes("corporate") || t.includes("mice") || t.includes("business") || t.includes("meeting")) {
      reply = "For business events, VIJAYA offers conference halls, a boardroom, exhibition grounds and AV-ready stages — with parking, access and production load-in planned per event.";
      suggestions = ["Request a quote", "Check business dates", "Book a venue visit"];
      action = { label: "Explore business events", href: "/business" };
    } else if (t.includes("birthday") || t.includes("anniversary") || t.includes("celebrat") || t.includes("party")) {
      reply = "Celebrations of every scale — private dinners on the lake deck, family stays in our hospitality rooms, community events on the lawns. What's the occasion and roughly how many guests?";
      action = { label: "Explore celebrations", href: "/celebrations" };
    } else if (t.includes("visit") || t.includes("tour") || t.includes("see the venue")) {
      reply = showVirtualTour
        ? "A private venue visit is the best way to feel the destination. You can also walk it in 360° right now, from anywhere."
        : "A private venue visit is the best way to feel the destination. Book a walk-through with the VIJAYA events team.";
      suggestions = showVirtualTour ? ["Book a venue visit", "Open 360° tour"] : ["Book a venue visit"];
      action = { label: "Request a visit", href: "/venue-visit" };
    } else if (showVirtualTour && (t.includes("360") || t.includes("virtual"))) {
      reply = "The 360° experience lets you drag, zoom and jump between the grand hall, lobby and lake deck — on desktop and mobile.";
      action = { label: "Enter 360° Experience", href: "/360-tour" };
    } else if (t.includes("nri") || t.includes("gcc") || t.includes("dubai") || t.includes("abroad") || t.includes("qatar") || t.includes("saudi")) {
      reply = "The VIJAYA Global Desk serves families in the UAE, Qatar, Oman, Saudi Arabia, Kuwait and Bahrain — remote date checking, virtual consultations, digital documents and online payment.";
      action = { label: "Visit the Global Desk", href: "/global-desk" };
    } else if (t.includes("hello") || t.includes("hi") || t.includes("hey") || t.length < 3) {
      reply = "Planning an event? I can help you find the right VIJAYA space — tell me the occasion, the date or the guest count.";
      suggestions = ["Wedding for 500 guests", "Is 2026-01-24 available?", "Business conference options"];
    } else if (t.includes("contact") || t.includes("call") || t.includes("human") || t.includes("team")) {
      reply = "You can reach the VIJAYA events team through the contact page — or share your number there and the team calls you back within one working day.";
      action = { label: "Contact VIJAYA", href: "/contact" };
    } else {
      reply = "I can help with venues, guest counts, dates and planning. Try asking about a space by name, a date in YYYY-MM-DD format, or tell me what you're planning.";
      suggestions = ["What spaces do you have?", "Check my date", "NRI wedding planning"];
    }

    return NextResponse.json({ reply, suggestions, action });
  } catch (e) {
    console.error("concierge error", e);
    return NextResponse.json(
      { reply: "I'm having trouble right now — please try again in a moment, or reach the team from the contact page.", suggestions: [], action: null },
      { status: 200 }
    );
  }
}
