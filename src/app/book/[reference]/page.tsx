import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";

export const metadata: Metadata = {
  title: "Booking Details",
  description: "Submit or track your VIJAYA reservation.",
  robots: { index: false },
};

export default async function BookReferencePage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return (
    <main className="min-h-screen bg-ivory">
      <section className="bg-burgundy text-ivory pt-10 md:pt-14 pb-10">
        <div className="container-editorial max-w-4xl">
          <p className="eyebrow">VIJAYA Reservations</p>
          <h1 className="h-display mt-3">Your Booking Details.</h1>
        </div>
      </section>
      <section className="py-12 md:py-16">
        <Suspense fallback={<div className="container-editorial max-w-4xl"><div className="card-editorial p-10 text-center text-stone text-sm">Loading checkout…</div></div>}>
          <CheckoutFlow reference={reference.toUpperCase()} />
        </Suspense>
      </section>
    </main>
  );
}
