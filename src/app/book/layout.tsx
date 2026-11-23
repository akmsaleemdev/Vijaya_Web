
import { CmsCopyProvider } from "@/lib/cms/client";
import { getCopyBundle, getComponentCopy } from "@/lib/cms/read";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

/** Minimal booking chrome — no site header, no concierge, full focus. */
export default async function BookLayout({ children }: { children: React.ReactNode }) {
  const cmsCopy = await getComponentCopy("copy.app.book.layout");
  return (
    <CmsCopyProvider bundle={await getCopyBundle("book")}>
    <div className="min-h-screen flex flex-col">
      <header className="bg-ink text-ivory">
        <div className="container-editorial flex items-center justify-between h-16">
          <Logo variant="white" href="/" size="book" priority />
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-ivory/60">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />{cmsCopy("text.secure-booking", " Secure booking")}</span>
        </div>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
    </CmsCopyProvider>
  );
}
