"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[80vh] bg-ivory flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-9 w-9 text-gold mx-auto" aria-hidden />
        <h1 className="h-section mt-5">Something interrupted the moment.</h1>
        <p className="lede mt-4 text-[14px]">
          We hit an unexpected error. Your data is safe — please try again, and if it persists the VIJAYA team is one
          message away.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button onClick={reset} className="btn-primary"><span>Try Again</span></button>
          <Link href="/" className="btn-outline"><span>Back to VIJAYA</span></Link>
        </div>
      </div>
    </main>
  );
}
