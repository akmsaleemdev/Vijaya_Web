import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { db } from "@/lib/db";
import { contract, paid } from "./bookings";
import { failure } from "./http";
import { inr } from "@/lib/pricing";

export async function bookingDocument(req: Request, reference?: string) {
  const type = new URL(req.url).searchParams.get("type");
  if (!reference || (type !== "invoice" && type !== "confirmation")) return failure(422, "INVALID_DOCUMENT", "Choose a booking and document type.");
  const booking = await db.booking.findUnique({ where: { reference }, include: { payments: true } });
  if (!booking) return failure(404, "NOT_FOUND", "Booking not found.");
  if (type === "confirmation" && !["CONFIRMED", "COMPLETED", "NO_SHOW"].includes(booking.status)) return failure(409, "NOT_CONFIRMED", "The booking is not confirmed.");
  const balance = contract(booking) - paid(booking.payments);
  const amount = [
    ["Base amount", inr(booking.baseAmount)], ["Weekend uplift", inr(booking.weekendUplift)],
    ["Tax", inr(booking.taxAmount)], ["Total", inr(contract(booking))], ["Paid", inr(paid(booking.payments))], ["Balance", inr(balance)],
  ];
  const details = [
    ["Reference", booking.reference], ["Customer", booking.customerName], ["Venue", booking.spaceName],
    ["Event date", booking.eventDate], ["Session", booking.slot.replaceAll("_", " ")],
    ["Guests", String(booking.guests)], ["Status", booking.status.replaceAll("_", " ")],
    ...(type === "invoice" ? amount : []),
  ];
  const document = new Document({ sections: [{ children: [
    new Paragraph({ text: "VIJAYA International Convention Centre", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: type === "invoice" ? "Booking invoice" : "Booking confirmation", heading: HeadingLevel.HEADING_2 }),
    ...details.map(([label, value]) => new Paragraph({ children: [new TextRun({ text: label + "  ", bold: true }), new TextRun(value)] })),
  ] }] });
  const buffer = await Packer.toBuffer(document);
  return new Response(new Uint8Array(buffer), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename="vijaya-${type}.docx"`, "Cache-Control": "no-store",
  } });
}
