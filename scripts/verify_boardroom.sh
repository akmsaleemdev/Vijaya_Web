#!/usr/bin/env bash
# Boardroom page verification across 4 viewports + structural DOM checks + lightbox test
set -u
SESSION="boardroom-verify"
URL="http://localhost:3000/spaces/boardroom"
agent-browser close --session "$SESSION" >/dev/null 2>&1 || true

check_viewport() {
  local W=$1; local H=$2; local NAME=$3
  echo "=== ${NAME}  ${W}x${H} ==="
  agent-browser open "$URL" --session "$SESSION" >/dev/null 2>&1
  agent-browser set viewport "$W" "$H" --session "$SESSION" >/dev/null 2>&1
  agent-browser open "$URL" --session "$SESSION" >/dev/null 2>&1
  sleep 5
  agent-browser eval --session "$SESSION" "(() => {
    const heroImg = document.querySelector('section.relative.overflow-hidden img[data-nimg=\"fill\"]');
    const heroSrc = heroImg ? (heroImg.getAttribute('src') || '').match(/VICC-\d+/)?.[0] : 'NO HERO';
    const heroAlt = heroImg ? heroImg.getAttribute('alt') : '?';
    const eyebrow = document.querySelector('section p.eyebrow')?.textContent || '?';
    const heading = document.querySelector('section h1')?.textContent || '?';
    const gallerySection = Array.from(document.querySelectorAll('section')).find(s => /Gallery/.test(s.querySelector('p.eyebrow-dark')?.textContent || ''));
    const galleryImgs = gallerySection ? gallerySection.querySelectorAll('img[data-nimg=\"fill\"]') : [];
    const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute('src') || '').match(/VICC-\d+/)?.[0] || '?').join(',');
    const visibleBadges = gallerySection ? Array.from(gallerySection.querySelectorAll('*')).filter(el => el.children.length === 0 && /PLACEHOLDER|badge/i.test(el.textContent || '')).length : -1;
    const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
    const oldBoardroomJpg = document.querySelectorAll('img[src*=\"space-boardroom.jpg\"]').length;
    const oldHeroBusinessJpg = document.querySelectorAll('img[src*=\"hero-business.jpg\"]').length;
    return JSON.stringify({heroSrc, heroAlt, eyebrow, heading, galleryCount: galleryImgs.length, gallerySrcs, visibleBadges, horizontalOverflow, oldBoardroomJpg, oldHeroBusinessJpg}, null, 2);
  })()"
  echo ""
}

check_viewport 1440 900 "desktop-1440"
check_viewport 1920 1080 "desktop-1920"
check_viewport 768 1024 "tablet-768"
check_viewport 390 844 "mobile-390"

echo "=== HERO CONTRAST (1440x900) ==="
agent-browser open "$URL" --session "$SESSION" >/dev/null 2>&1
agent-browser set viewport 1440 900 --session "$SESSION" >/dev/null 2>&1
sleep 5
agent-browser screenshot --session "$SESSION" /tmp/render/boardroom-hero-1440.jpg
echo "saved hero screenshot"

echo ""
echo "=== GALLERY FULL PAGE ==="
agent-browser eval --session "$SESSION" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (g) g.scrollIntoView({block:"start"}); return "ok"; })()' >/dev/null
sleep 4
agent-browser screenshot --session "$SESSION" --full /tmp/render/boardroom-fullpage-1440.jpg
agent-browser eval --session "$SESSION" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (!g) return "NO GAL"; const r = g.getBoundingClientRect(); return JSON.stringify({top: r.top + window.scrollY, height: r.height, width: r.width}); })()'

echo ""
echo "=== LIGHTBOX TEST ==="
agent-browser eval --session "$SESSION" '(() => { const gal = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); const btn = gal.querySelector("button[aria-label^=\"Open image\"]"); if (!btn) return "NO BUTTON"; btn.click(); return "clicked"; })()'
sleep 2
agent-browser eval --session "$SESSION" '(() => { const lb = document.querySelector("[role=\"dialog\"][aria-label=\"Image lightbox\"]"); if (!lb) return "NO LIGHTBOX"; const img = lb.querySelector("img"); const counter = lb.querySelector("div.absolute.bottom-6")?.textContent?.trim(); return JSON.stringify({open: true, imgSrc: (img?.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?", counter}); })()'
agent-browser screenshot --session "$SESSION" /tmp/render/boardroom-lightbox-1.jpg
echo "--- Arrow Right ---"
agent-browser press ArrowRight --session "$SESSION" >/dev/null
sleep 1
agent-browser eval --session "$SESSION" '(() => { const lb = document.querySelector("[role=\"dialog\"][aria-label=\"Image lightbox\"]"); const img = lb.querySelector("img"); const counter = lb.querySelector("div.absolute.bottom-6")?.textContent?.trim(); return JSON.stringify({imgSrc: (img?.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?", counter}); })()'
echo "--- Arrow Right again ---"
agent-browser press ArrowRight --session "$SESSION" >/dev/null
sleep 1
agent-browser eval --session "$SESSION" '(() => { const lb = document.querySelector("[role=\"dialog\"][aria-label=\"Image lightbox\"]"); const img = lb.querySelector("img"); const counter = lb.querySelector("div.absolute.bottom-6")?.textContent?.trim(); return JSON.stringify({imgSrc: (img?.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?", counter}); })()'
echo "--- Escape to close ---"
agent-browser press Escape --session "$SESSION" >/dev/null
sleep 1
agent-browser eval --session "$SESSION" '(() => { const lb = document.querySelector("[role=\"dialog\"][aria-label=\"Image lightbox\"]"); return lb ? "STILL OPEN" : "CLOSED"; })()'

echo ""
echo "=== CONSOLE (filtered) ==="
agent-browser console --session "$SESSION" 2>/dev/null | grep -iE "error|warning" | grep -v "React DevTools\|HMR" | head -15

agent-browser close --session "$SESSION" >/dev/null 2>&1
echo "=== DONE ==="
