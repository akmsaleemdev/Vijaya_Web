import localFont from "next/font/local";

/**
 * VIJAYA typography — Poppins, self-hosted via next/font/local.
 *
 * Previously loaded through four `@fontsource/poppins/<weight>.css` imports in
 * the root layout, which (a) fetched each weight through a separate CSS
 * @font-face rule discovered only after stylesheet parse, (b) never preloaded
 * the critical weight, and (c) shipped the full font CSS chain on every page.
 *
 * next/font/local instead:
 *  - bakes the four latin-subset woff2 files (~8 KB each) into the Next build,
 *  - preloads the 400 (body) weight so it is available for first paint,
 *  - sets font-display: swap so text is visible immediately (no FOIT),
 *  - exposes the family as the `--font-poppins` CSS variable.
 *
 * Only the four weights actually used on the site are loaded (300 light, 400
 * normal, 500 medium, 600 semibold — see the Tailwind font-* class audit).
 * Typography is unchanged: same Poppins family, same weights.
 */
export const poppins = localFont({
  src: [
    { path: "./fonts/poppins-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "./fonts/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  preload: true,
});
