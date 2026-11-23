"use client";
import { useCmsCopy } from "@/lib/cms/client";


import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

const LINKS = [
  { href: "/my-vijaya/dashboard", label: "Overview" },
  { href: "/my-vijaya/booking", label: "Booking" },
  { href: "/my-vijaya/payments", label: "Payments" },
  { href: "/my-vijaya/documents", label: "Documents" },
  { href: "/my-vijaya/event-plan", label: "Event Plan" },
  { href: "/my-vijaya/support", label: "Support" },
];

export function PortalNav() {
  const cmsCopy = useCmsCopy("copy.components.portal.portal-nav");
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/my-vijaya");
    router.refresh();
  };

  return (
    <nav aria-label={cmsCopy("aria-label.portal", "Portal")} className="bg-ivory hairline-b sticky top-0 z-30">
      <div className="container-editorial flex items-center justify-between gap-4 overflow-x-auto">
        <ul className="flex gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`inline-block px-4 py-4 text-[12px] uppercase tracking-[0.14em] whitespace-nowrap transition-colors border-b-2 ${
                    active ? "text-burgundy border-burgundy font-medium" : "text-stone border-transparent hover:text-ink"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <button onClick={logout} className="hidden sm:inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-stone hover:text-burgundy transition-colors py-4">
          <LogOut className="h-3.5 w-3.5" />{cmsCopy("text.sign-out", " Sign out")}</button>
      </div>
    </nav>
  );
}
