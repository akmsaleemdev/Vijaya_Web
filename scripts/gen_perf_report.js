// VIJAYA Website Performance Optimization — Before/After Report (docx)
// Cover: R1 (Pure Paragraph Left) + IG-1 (Ink Gold) palette — aligns with
// VIJAYA's premium burgundy/gold branding. Body: English report, Times New
// Roman body, Arial Bold headings, 1.3x line spacing.
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, PageNumber, PageBreak,
  WidthType, BorderStyle, ShadingType, TableLayoutType, SectionType,
} = require("docx");
const fs = require("fs");

// ── IG-1 Ink Gold palette (VIJAYA premium) ──
const P = {
  bg: "1A1A1A", primary: "FFFFFF", accent: "C9A84C",
  titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "C9A84C", footerColor: "8A8A8A",
  body: "1A1A1A", secondary: "5A5A5A",
};
const T = { headerBg: "C9A84C", headerText: "1A1A1A", innerLine: "DDD5C0", surface: "F5F2E8" };

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ── Title layout (simplified calcTitleLayout) ──
function calcTitleLayout(title, maxWidthTwips, preferredPt = 34, minPt = 24) {
  const charWidth = (pt) => pt * 11; // English avg char width ≈ pt*11 twips
  let titlePt = preferredPt;
  let lines;
  const split = (t, cpl) => {
    const words = t.split(" "); const out = []; let cur = "";
    for (const w of words) { if ((cur + " " + w).trim().length > cpl) { if (cur) out.push(cur.trim()); cur = w; } else cur = (cur + " " + w).trim(); }
    if (cur) out.push(cur); return out;
  };
  while (titlePt >= minPt) {
    const cpl = Math.floor(maxWidthTwips / charWidth(titlePt));
    lines = split(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  return { titlePt, titleLines: lines || [title] };
}

// ── R1 Cover ──
function buildCoverR1(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 34, 24);
  const titleSize = titlePt * 2;
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: 4200 } }));
  // English label
  children.push(new Paragraph({
    indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
    children: [new TextRun({ text: "P E R F O R M A N C E   A U D I T", size: 18, color: P.accent, font: { ascii: "Arial" }, characterSpacing: 40 })],
  }));
  // Title lines
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: P.titleColor, font: { ascii: "Arial" } })],
    }));
  }
  // Subtitle
  children.push(new Paragraph({
    indent: { left: padL }, spacing: { after: 800 },
    children: [new TextRun({ text: config.subtitle, size: 26, color: P.subtitleColor, font: { ascii: "Arial" } })],
  }));
  // Meta lines
  for (const line of config.metaLines) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 90 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 22, color: P.metaColor, font: { ascii: "Arial" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: 3800 } }));
  // Footer
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft, size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight, size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders, children })],
    })],
  })];
}

// ── Body helpers ──
const FONT = { ascii: "Times New Roman" };
const HFONT = { ascii: "Arial" };
function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 140 }, children: [new TextRun({ text, bold: true, color: P.body, font: HFONT, size: 32 })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun({ text, bold: true, color: P.body, font: HFONT, size: 26 })] }); }
function body(text) { return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { line: 312, after: 120 }, children: [new TextRun({ text, size: 22, color: P.body, font: FONT })] }); }
function bullet(text) { return new Paragraph({ bullet: { level: 0 }, spacing: { line: 300, after: 60 }, children: [new TextRun({ text, size: 22, color: P.body, font: FONT })] }); }
function kv(k, v) { return new Paragraph({ spacing: { line: 300, after: 50 }, children: [new TextRun({ text: k + ": ", bold: true, size: 22, color: P.body, font: FONT }), new TextRun({ text: v, size: 22, color: P.body, font: FONT })] }); }

// ── Metrics table (Horizontal-Only style) ──
function metricsTable() {
  const hdr = (t) => new TableCell({ shading: { type: ShadingType.CLEAR, fill: T.headerBg }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, color: T.headerText, font: HFONT })] })] });
  const cell = (t, idx) => new TableCell({ shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? T.surface : "FFFFFF" }, margins: { top: 70, bottom: 70, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, size: 20, color: P.body, font: FONT })] })] });
  const rows = [
    ["Metric", "Before", "After", "Change"],
    ["Hero video (desktop)", "12.70 MB (1080p)", "5.46 MB (540p)", "-57%"],
    ["Hero video (mobile)", "12.70 MB (full res)", "2.08 MB (360p)", "-84%"],
    ["Hero video load timing", "Immediate (competes with LCP)", "Deferred past LCP", "Out of critical path"],
    ["Fonts loading", "@fontsource CSS, 4 weights, no preload", "next/font/local, 2 preloaded, swap", "Preloaded + swap"],
    ["Font CSS round-trip", "4 CSS imports", "0 (baked into build)", "Eliminated"],
    ["JS bundle (raw)", "2.0 MB", "1.9 MB", "-5%"],
    ["CSS bundle (raw)", "148 KB", "139.7 KB", "-6%"],
    ["Homepage critical payload (gzip)", "~295 KB + 12.7 MB video", "319.9 KB (video excluded)", "Video no longer blocks"],
    ["Cache headers (static)", "None (default)", "immutable, 1 year", "Repeat visits instant"],
    ["Image formats", "WebP default", "AVIF + WebP explicit", "~50% smaller vs JPEG"],
    ["YouTube preconnects", "4 (unused — hero is self-hosted)", "0", "Removed"],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: P.accent }, bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent }, left: NB, right: NB, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: T.innerLine }, insideVertical: NB },
    rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0, cantSplit: true, children: i === 0 ? r.map(hdr) : r.map((c, j) => cell(c, i)) })),
  });
}

// ── Files changed table ──
function filesTable() {
  const hdr = (t) => new TableCell({ shading: { type: ShadingType.CLEAR, fill: T.headerBg }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 20, color: T.headerText, font: HFONT })] })] });
  const cell = (t, idx) => new TableCell({ shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? T.surface : "FFFFFF" }, margins: { top: 70, bottom: 70, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: t, size: 20, color: P.body, font: FONT })] })] });
  const rows = [
    ["File", "Change"],
    ["src/components/media/hero-background.tsx", "Responsive <source media> mobile/desktop + defer autoplay past LCP (shouldLoadVideo via window.load + requestIdleCallback) + videoRef .load()/.play()"],
    ["src/app/(site)/page.tsx", "Homepage hero now references vijaya-hero-desktop.mp4 + vijaya-hero-mobile.mp4"],
    ["src/lib/fonts.ts (new)", "next/font/local loader for 4 Poppins weights (latin subset woff2, preload, swap)"],
    ["src/lib/fonts/*.woff2 (new)", "4 Poppins latin woff2 files (~8 KB each) baked into the build"],
    ["src/app/layout.tsx", "Removed 4 @fontsource CSS imports + wasted YouTube preconnects; applied poppins.variable to <body>"],
    ["src/app/globals.css", "--font-sans + body font-family now use var(--font-poppins)"],
    ["next.config.ts", "Added images.formats (AVIF+WebP) + Cache-Control headers (immutable 1yr static, 30d media/brand)"],
    ["public/media/vijaya-hero-desktop.mp4 (new)", "960x540 H.264 CRF 28, 5.46 MB"],
    ["public/media/vijaya-hero-mobile.mp4 (new)", "640x360 H.264 CRF 30, 2.08 MB"],
    ["public/media/vijaya-web-video-01.mp4 (removed)", "Old 12.70 MB source — replaced by encoded variants"],
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: P.accent }, bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent }, left: NB, right: NB, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: T.innerLine }, insideVertical: NB },
    rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0, cantSplit: true, children: i === 0 ? r.map(hdr) : r.map((c, j) => cell(c, i)) })),
  });
}

// ── Body content ──
const bodyChildren = [
  h1("1. Executive Summary"),
  body("The VIJAYA International Convention Centre website has been audited end-to-end and optimized for significantly faster initial load, page transitions and mobile performance. The optimization preserved the approved visual design, branding, typography, hero composition, navigation, booking functionality and all existing routes. No sections were removed, no official photography was downgraded, and the 360 virtual tour feature remains hidden with its library excluded from public-page bundles."),
  body("The single largest bottleneck was the homepage hero video: a 12.70 MB self-hosted MP4 at 1920x1080 that began downloading immediately on page load (autoplay forced progressive buffering) and competed directly with the Largest Contentful Paint element for bandwidth. On mobile this meant the full 12.70 MB file was fetched regardless of viewport. This has been re-encoded into a 5.46 MB desktop variant (960x540) and a 2.08 MB mobile variant (640x360), with responsive source selection and loading deferred past LCP so zero video bytes are requested until the poster and hero copy are interactive."),
  body("Secondary wins came from converting the font stack from @fontsource CSS imports to next/font/local (preloaded critical weights, font-display swap, no CSS round-trip), adding immutable long-lived cache headers for hashed static assets and media, explicitly enabling AVIF/WebP image delivery, and removing four wasted YouTube preconnect hints left over from an earlier hero implementation. The result is a homepage critical payload of 319.9 KB (gzip) with the hero video completely outside the critical rendering path."),

  h1("2. Performance Metrics: Before vs After"),
  body("The table below summarises the measured and verified changes. Homepage critical payload is the gzip sum of HTML, all referenced JavaScript chunks, CSS and font files; the hero video is listed separately because it now loads after first paint rather than blocking it."),
  metricsTable(),
  new Paragraph({ spacing: { after: 160 }, children: [] }),

  h1("3. Hero Video Optimization"),
  body("The homepage hero used a single 12.70 MB MP4 (1920x1080, H.264, 3.27 Mbps, 32.5 seconds) rendered through a <video> element with autoPlay, muted, loop, playsInline and preload='metadata'. Although preload was set to metadata, the autoPlay attribute forces the browser to buffer enough video to begin playback, so the file was downloaded progressively starting from the first network round-trips — directly competing with the hero poster (the LCP element) and the above-the-fold JavaScript."),
  h2("Re-encoding"),
  body("The source footage is high-detail (water, landscape, architectural detail), so naive CRF compression at native resolution barely reduced the size. The video plays behind a dark vignette overlay and a bottom gradient fade, which masks moderate resolution reduction. It was therefore re-encoded with ffmpeg into two variants: a desktop file at 960x540 (H.264, CRF 28, no audio, +faststart) weighing 5.46 MB, and a mobile file at 640x360 (H.264, CRF 30, no audio, +faststart) weighing 2.08 MB. Audio was stripped because the hero is muted. The +faststart flag moves the moov atom to the front so playback can begin streaming on the first byte."),
  h2("Responsive source selection"),
  body("The hero-background component now accepts separate mp4 and mp4Mobile sources and renders them as <source> elements with a media attribute: the mobile source is listed first with media='(max-width: 768px)' so phones pick the 2.08 MB file, while desktop and tablet-above-768px fall through to the 5.46 MB file. Browser testing confirmed the correct source is chosen at each viewport: 1920px loads the desktop variant, 768px loads the mobile variant, and 390px loads the mobile variant. Mobile users no longer download desktop-resolution video."),
  h2("Deferred loading past LCP"),
  body("A shouldLoadVideo state gate was added. On mount, the component waits for the window load event (or, if the page is already complete, a requestIdleCallback with a 1.5 second timeout) before flipping shouldLoadVideo to true. Until that moment, the <video> element renders with preload='none' and no <source> children, so the browser requests zero video bytes. The poster — a same-video still frame rendered as a priority next/image — remains the LCP element and loads without competing with video traffic. When shouldLoadVideo flips, the sources render and the component explicitly calls video.load() then video.play() (muted autoplay is always permitted by browsers). The transition from poster to video is visually imperceptible because both are frames from the same footage. prefers-reduced-motion is respected: reduced-motion users see the poster only, with no autoplay."),

  h1("4. Font Optimization"),
  body("VIJAYA's typography is Poppins, loaded across four weights (300 light, 400 normal, 500 medium, 600 semibold — all four are actively used, verified by auditing every Tailwind font-weight class and CSS declaration). Previously these were imported as four separate @fontsource/poppins CSS files in the root layout. That approach discovered each font file only after the stylesheet parsed (a CSS round-trip), never preloaded the critical weight, and shipped the @font-face declarations on every page."),
  body("The font stack was migrated to next/font/local, pointing at the four latin-subset Poppins woff2 files copied into src/lib/fonts/ (each approximately 8 KB). next/font/local bakes the font files into the Next.js build, preloads the critical 400 normal weight (and the 300 weight used by the hero lede) with rel='preload' as='font', sets font-display: swap so text is visible immediately without a flash of invisible text, and exposes the family as the --font-poppins CSS variable consumed by globals.css. Typography is unchanged — the same Poppins family and weights — but the loading is now preload-driven and free of the CSS round-trip. The four @fontsource CSS imports were removed from the root layout."),

  h1("5. Image and Gallery Handling"),
  body("A full audit confirmed that the site's image pipeline was already well-structured and required no changes. All imagery flows through a central Media wrapper component that uses next/image with fill, correct per-context sizes attributes, and quality control. next/image automatically generates responsive srcset entries and serves AVIF and WebP (now explicitly configured in next.config) at the exact pixel dimensions the browser requests, so visitors never download the multi-megabyte source originals (the largest source images are 1.5–2.3 MB)."),
  body("Galleries (Periyar, Nila, Kabani, Boardroom, Hospitality, VIP Dining and the main gallery) use reserved aspect-ratio containers (aspect-[3/4], aspect-square, aspect-[4/3]) so no layout shift occurs while images decode. Below-the-fold images default to loading='lazy' via next/image and only fetch as they approach the viewport; the lightbox image alone uses priority so it appears instantly when opened. Browser verification on /spaces/periyar confirmed 11 of 13 images are lazy-loaded and all 13 load correctly after scrolling, with zero broken references."),

  h1("6. JavaScript Bundle and 360 Exclusion"),
  body("The production JavaScript bundle is 1.9 MB raw across all chunks. The largest single chunk is 535 KB and contains the three.js library used by the 360 panorama viewer. Critically, this chunk is dynamically imported (the panorama-360-wrapper uses next/dynamic to load panorama-viewer only on the /360-tour route) and is NOT referenced by the homepage or any public page — verified by checking the served homepage HTML against the chunk hash. The 360 virtual tour feature remains hidden (SHOW_VIRTUAL_TOUR = false), the homepage 360 teaser section is gated off, the mobile-menu link is gated off, and the footer filters it out."),
  body("All other heavy dependencies — recharts, embla-carousel, react-resizable-panels, react-day-picker, cmdk, vaul, input-otp, @mdxeditor/editor, @dnd-kit and react-syntax-highlighter — are isolated inside shadcn/ui component files and are only bundled on routes that actually import them. None of the public pages (homepage, weddings, business, celebrations, spaces, experiences, plan-your-event, about) import those UI components, so none of those libraries ship to public visitors. The root main framework chunks (React 19 + Next.js runtime, approximately 327 KB) are unavoidable and load on every page."),

  h1("7. Caching, Compression and Asset Cleanup"),
  body("next.config.ts now sets Cache-Control headers: hashed build assets under /_next/static/ receive 'public, max-age=31536000, immutable' (one year) because their filenames include a content hash, so a changed file gets a new URL and the old one can be cached forever. This makes repeat visits and client-side page navigation near-instant because nothing is re-downloaded. Self-hosted media (/media/, including the hero video variants and poster) and brand logos (/brand/) receive 'public, max-age=2592000, immutable' (30 days); re-encoding a video means renaming the file, so immutability is safe. Image formats are explicitly set to AVIF and WebP."),
  body("Asset cleanup removed the old 12.70 MB hero video source from public/ after confirming zero references in the codebase (the homepage now points at the encoded variants). The four unused YouTube preconnect/dns-prefetch hints in the root layout were removed because the hero is self-hosted, not YouTube-embedded. The @fontsource CSS imports were removed. No referenced asset was deleted."),

  h1("8. Files and Components Changed"),
  body("The table below lists every file created, modified or removed during this optimization. No file outside this list was touched. The approved design, branding, logo system, typography, hero copy, navigation and booking functionality are unchanged."),
  filesTable(),
  new Paragraph({ spacing: { after: 160 }, children: [] }),

  h1("9. Remaining Limitations"),
  body("Three items remain outside the scope of code-level optimization and are documented for completeness. First, the /logo.svg URL returns HTTP 200 through the Caddy reverse proxy (port 81) even though the production Next.js application returns HTTP 404 for it; this is because Caddy's configuration file (/app/Caddyfile, root-owned and not editable from the application sandbox) has a file_server static root that still contains an old logo.svg. No code references this URL and no page displays it, so it is an invisible dead endpoint, but fully clearing it requires root access to reload Caddy's configuration."),
  body("Second, the production JavaScript framework chunks (React 19 and the Next.js App Router runtime) are approximately 327 KB gzip on every page and cannot be reduced without changing the framework. Third, real Lighthouse/Core Web Vitals field measurements were not captured in this environment because a headless Lighthouse runner was not available; the improvements are quantified through transferred-byte measurements, build-output analysis, and browser verification of asset selection, lazy-loading behaviour and rendering. The architectural changes (video deferral past LCP, responsive mobile video, font preloading, immutable caching) directly target the LCP, mobile payload and repeat-visit metrics that Lighthouse measures."),

  h1("10. Verification Results"),
  body("A clean production build completed successfully with no errors. The standalone production server was redeployed (bun .next/standalone/server.js on port 3000, proxied by Caddy on port 81) and came up in 84 milliseconds with no runtime errors. All fifteen required pages return HTTP 200: the homepage, weddings, business, celebrations, spaces, the six space detail pages (periyar, nila, kabani, boardroom, hospitality, vip-dining), experiences, plan-your-event, about and contact."),
  body("Browser testing across three viewports confirmed visual and behavioural integrity. At desktop (1920x1080) the hero video loads the desktop variant and plays correctly with zero broken images and the gold logo intact at 200x55. At tablet (768x1024) the mobile video variant is correctly selected. At mobile (390x844) the mobile variant is selected (2.08 MB instead of the desktop file), the logo renders at 150x41, the mobile menu opens with all navigation links present and the 360 link correctly hidden, and there is no horizontal overflow. The /spaces/periyar gallery lazy-loads 11 of 13 images and all load on scroll with zero broken references. The check-your-date page renders correctly with the booking wizard interactive. The 360 panorama chunk is confirmed absent from the homepage bundle. All three official logos (burgundy, gold, white) are served at their correct 1081x300 dimensions and the legacy black, brown and logo.svg files return HTTP 404 from the application."),
];

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22, color: P.body }, paragraph: { spacing: { line: 312 } } } } },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } }, children: buildCoverR1({ title: "VIJAYA Website Performance Optimization", subtitle: "Before / After Audit & Optimization Report", metaLines: ["Date: 23 November 2026", "Scope: Full-site performance, all routes", "Build: next standalone production (Next.js 16)", "Status: Deployed & verified"], footerLeft: "VIJAYA International Convention Centre", footerRight: "Performance Report" }) },
    { properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["VIJAYA Performance Report  |  Page ", PageNumber.CURRENT], size: 18, color: P.secondary, font: FONT })] })] }) },
      children: bodyChildren },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync("/home/z/my-project/download/VIJAYA_Performance_Report.docx", buf); console.log("written:", buf.length, "bytes"); });
