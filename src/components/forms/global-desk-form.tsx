"use client";
import { useCmsCopy } from "@/lib/cms/client";


import { Suspense } from "react";
import { EnquiryForm } from "./enquiry-form";

export function GlobalDeskForm() {
  const cmsCopy = useCmsCopy("copy.components.forms.global-desk-form");
  return (
    <Suspense fallback={<div className="card-editorial p-10 text-center text-stone text-sm">{cmsCopy("text.loading-form", "Loading form…")}</div>}>
      <EnquiryForm variant="GLOBAL_DESK" />
    </Suspense>
  );
}
