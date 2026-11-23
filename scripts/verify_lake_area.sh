#!/usr/bin/env bash
# All-in-one: start dev server, wait, run all visual tests for Lake Area
set -u
cd /home/z/my-project

pkill -f "next" 2>/dev/null
sleep 2

nohup setsid ./node_modules/.bin/next dev -p 3000 > dev.log 2>&1 < /dev/null &
disown

echo "Waiting for server..."
for i in $(seq 1 30); do
  if ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "Server ready after ${i}s"
    break
  fi
  sleep 1
done
sleep 5

echo ""
echo "=== BROWSER VISUAL TESTS ==="
agent-browser close --session "lake-vis" >/dev/null 2>&1 || true

# Desktop 1440x900
agent-browser open "http://localhost:3000/spaces/lake-area" --session "lake-vis" >/dev/null 2>&1
agent-browser set viewport 1440 900 --session "lake-vis" >/dev/null 2>&1
agent-browser open "http://localhost:3000/spaces/lake-area" --session "lake-vis" >/dev/null 2>&1
sleep 10
echo "--- Desktop 1440x900 structure ---"
agent-browser eval --session "lake-vis" '(() => {
  const heroImg = document.querySelector("section img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? (heroImg.getAttribute("src") || "").match(/VICC-\d+/)?.[0] : "NO HERO";
  const heroAlt = heroImg ? heroImg.getAttribute("alt") : "?";
  const eyebrow = document.querySelector("section p.eyebrow")?.textContent || "?";
  const heading = document.querySelector("section h1")?.textContent || "?";
  const intro = document.querySelector("section p.lede")?.textContent?.trim()?.slice(0,60) || "?";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc, heroAlt, eyebrow, heading, intro, galleryCount: galleryImgs.length, gallerySrcs, horizontalOverflow}, null, 2);
})()'
agent-browser screenshot --session "lake-vis" /tmp/render/lake-hero-1440.jpg
echo "Saved lake-hero-1440.jpg"

# Gallery full page
agent-browser eval --session "lake-vis" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (g) g.scrollIntoView({block:"start"}); return "ok"; })()' >/dev/null
sleep 5
agent-browser screenshot --session "lake-vis" --full /tmp/render/lake-fullpage-1440.jpg
echo "Saved lake-fullpage-1440.jpg"

# Get gallery bounding box
agent-browser eval --session "lake-vis" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (!g) return "NO GAL"; const r = g.getBoundingClientRect(); return JSON.stringify({top: r.top + window.scrollY, height: r.height}); })()'

# Lightbox test
echo ""
echo "=== LIGHTBOX TEST ==="
agent-browser eval --session "lake-vis" '(() => { const gal = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); const btn = gal.querySelector("button[aria-label^=\"Open image\"]"); if (!btn) return "NO BUTTON"; btn.click(); return "clicked"; })()'
sleep 2
agent-browser eval --session "lake-vis" '(() => { const lb = document.querySelector("[role=\"dialog\"][aria-label=\"Image lightbox\"]"); if (!lb) return "NO LIGHTBOX"; const img = lb.querySelector("img"); const counter = lb.querySelector("div.absolute.bottom-6")?.textContent?.trim(); return JSON.stringify({open: true, imgSrc: (img?.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?", counter}); })()'
agent-browser press ArrowRight --session "lake-vis" >/dev/null
sleep 1
agent-browser eval --session "lake-vis" '(() => { const lb = document.querySelector("[role=\"dialog\"][aria-label=\"Image lightbox\"]"); const img = lb.querySelector("img"); const counter = lb.querySelector("div.absolute.bottom-6")?.textContent?.trim(); return JSON.stringify({imgSrc: (img?.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?", counter}); })()'
agent-browser press Escape --session "lake-vis" >/dev/null
sleep 1
agent-browser eval --session "lake-vis" '(() => { const lb = document.querySelector("[role=\"dialog\"][aria-label=\"Image lightbox\"]"); return lb ? "STILL OPEN" : "CLOSED"; })()'

# Mobile 390x844
echo ""
echo "--- Mobile 390x844 ---"
agent-browser open "http://localhost:3000/spaces/lake-area" --session "lake-vis" >/dev/null 2>&1
agent-browser set viewport 390 844 --session "lake-vis" >/dev/null 2>&1
agent-browser open "http://localhost:3000/spaces/lake-area" --session "lake-vis" >/dev/null 2>&1
sleep 8
agent-browser eval --session "lake-vis" '(() => {
  const h = document.querySelector("section img[data-nimg=\"fill\"]");
  const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const gi = g ? g.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  return JSON.stringify({heroSrc: (h?.getAttribute("src") || "").match(/VICC-\d+/)?.[0], galleryCount: gi.length, horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth});
})()'
agent-browser screenshot --session "lake-vis" /tmp/render/lake-mobile-hero-390.jpg
echo "Saved lake-mobile-hero-390.jpg"

echo ""
echo "=== CONSOLE (errors only) ==="
agent-browser console --session "lake-vis" 2>/dev/null | grep -iE "error" | grep -v "React DevTools\|HMR\|Download the React" | head -5

agent-browser close --session "lake-vis" >/dev/null 2>&1
echo ""
echo "=== DONE ==="
