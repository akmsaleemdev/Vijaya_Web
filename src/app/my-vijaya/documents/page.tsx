import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import { getPortalSession, getPortalBookings } from "@/lib/portal-auth";

export const metadata: Metadata = { title: "Portal — Documents" };

const TYPE_LABELS: Record<string, string> = {
  CONFIRMATION: "Booking Confirmation",
  INVOICE: "Invoice",
  RECEIPT: "Receipt",
  AGREEMENT: "Agreement",
  UPLOAD: "Your Upload",
};

export default async function PortalDocumentsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/my-vijaya");
  const bookings = await getPortalBookings(session.email);
  const b = bookings[0];

  return (
    <main className="py-12 md:py-16">
      <div className="container-editorial">
        <p className="eyebrow-dark">Documents</p>
        <h1 className="h-section mt-3">Everything in Writing.</h1>

        {!b ? (
          <p className="lede mt-6">No active booking found on your account.</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {b.documents.map((d) => (
              <div key={d.id} className="card-editorial p-6">
                <FileText className="h-5 w-5 text-gold" aria-hidden />
                <p className="mt-4 text-[14px] font-medium">{d.title}</p>
                <p className="text-[12px] text-stone mt-1">
                  {TYPE_LABELS[d.type] || d.type} · {new Date(d.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {d.type === "CONFIRMATION" ? (
                  <a href={`/my-vijaya/booking`} className="link-underline mt-4 inline-block text-[12px] uppercase tracking-[0.16em] text-burgundy">
                    View details
                  </a>
                ) : (
                  <p className="mt-4 text-[12px] text-stone/70 italic">PDF generation activates with the production gateway</p>
                )}
              </div>
            ))}
            <div className="card-editorial p-6 border-dashed !border-burgundy/30 bg-transparent">
              <Upload className="h-5 w-5 text-burgundy/50" aria-hidden />
              <p className="mt-4 text-[14px] font-medium text-stone">Customer uploads</p>
              <p className="text-[12px] text-stone/80 mt-1 leading-6">
                Upload agreements, ID documents and vendor plans — available once document storage is configured with VICC.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
