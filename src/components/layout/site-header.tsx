"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { MAIN_NAV, SITE, SHOW_VIRTUAL_TOUR } from "@/lib/site-config";
import { track } from "@/lib/analytics";
import { Logo } from "@/components/brand/logo";

/** Routes with dark cinematic heroes — header starts transparent over them. */
const DARK_HERO_ROUTES = [
  "/",
  "/about",
  "/weddings",
  "/business",
  "/celebrations",
  "/spaces",
  "/experiences",
  "/360-tour",
  "/gallery",
  "/global-desk",
];

export function SiteHeader({ navigation = MAIN_NAV, showVirtualTour = SHOW_VIRTUAL_TOUR }: {
  navigation?: typeof MAIN_NAV; showVirtualTour?: boolean;
} = {}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const overDarkHero =
    DARK_HERO_ROUTES.includes(pathname) || pathname.startsWith("/spaces/");
  const transparent = overDarkHero && !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  // Logo + text colour follow the header's actual rendered background. The
  // header stays transparent (over the dark hero OR the burgundy mobile-menu
  // panel) whenever `overDarkHero && !scrolled` — so the logo must stay light
  // in that whole state, including when the menu is open. Using `transparent`
  // alone would flip the logo to the burgundy variant the moment the mobile
  // menu opens, rendering it invisible on the burgundy panel underneath.
  const headerOverDark = overDarkHero && !scrolled;
  const logoVariant = headerOverDark ? "gold" : "burgundy";
  const textCls = headerOverDark ? "text-ivory" : "text-ink";

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          transparent ? "bg-transparent" : scrolled || !overDarkHero ? "bg-ivory/95 backdrop-blur-md shadow-[0_1px_0_rgba(17,17,17,0.08)]" : "bg-transparent"
        }`}
      >
        <div className="container-editorial flex items-center justify-between h-16 md:h-20">
          <Logo variant={logoVariant} href="/" size="header" priority />

          <nav aria-label="Primary" className="hidden lg:flex items-center gap-7">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link link-underline ${textCls} ${pathname.startsWith(item.href) ? "text-gold" : ""} hover:text-gold`}
                data-active={pathname.startsWith(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/check-your-date" onClick={() => track("hero_check_date_click", { source: "header" })} className="hidden md:inline-flex btn-primary !min-h-[42px] !px-5 text-[11px]">
              <span>Check Your Date</span>
            </Link>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className={`lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-sm transition-colors ${textCls}`}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-40 bg-burgundy text-ivory flex flex-col pt-24 pb-8"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <nav aria-label="Mobile" className="container-editorial flex-1 overflow-y-auto">
              <ul className="divide-y divide-ivory/10">
                {navigation.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center justify-between py-4 text-2xl font-light tracking-wide hover:text-gold transition-colors">
                      {item.label}
                      <ArrowUpRight className="w-5 h-5 text-gold/70" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-8 grid grid-cols-2 gap-3 text-sm text-ivory/70">
                <Link href="/gallery" onClick={() => setMenuOpen(false)} className="py-2">Gallery</Link>
                {showVirtualTour && (
                  <Link href="/360-tour" onClick={() => setMenuOpen(false)} className="py-2">360° Tour</Link>
                )}
                <Link href="/global-desk" onClick={() => setMenuOpen(false)} className="py-2">Global Desk</Link>
                <Link href="/my-vijaya" onClick={() => setMenuOpen(false)} className="py-2">My VIJAYA</Link>
                <Link href="/faq" onClick={() => setMenuOpen(false)} className="py-2">FAQ</Link>
                <Link href="/contact" onClick={() => setMenuOpen(false)} className="py-2">Contact</Link>
              </div>
            </nav>
            <div className="container-editorial pt-6">
              <Link href="/check-your-date" onClick={() => track("hero_check_date_click", { source: "mobile_menu" })} className="btn-gold w-full">
                Check Your Date
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
