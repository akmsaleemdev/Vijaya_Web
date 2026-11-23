"use client";

import { Suspense } from "react";
import { EnquiryForm } from "./enquiry-form";

export function GlobalDeskForm() {
  return (
    <Suspense fallback={<div className="card-editorial p-10 text-center text-stone text-sm">Loading form…</div>}>
      <EnquiryForm variant="GLOBAL_DESK" />
    </Suspense>
  );
}
