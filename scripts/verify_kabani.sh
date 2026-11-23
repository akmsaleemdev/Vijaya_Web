#!/usr/bin/env bash
# Kabani page verification across 4 viewports + structural DOM checks
set -u
SESSION="kabani-verify"
URL="http://localhost:3000/spaces/kabani"
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
    const intro = document.querySelector('section p.lede')?.textContent?.trim()?.slice(0,50) || '?';
    const gallerySection = Array.from(document.querySelectorAll('section')).find(s => /Gallery/.test(s.querySelector('p.eyebrow-dark')?.textContent || ''));
    const galleryImgs = gallerySection ? gallerySection.querySelectorAll('img[data-nimg=\"fill\"]') : [];
    const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute('src') || '').match(/VICC-\d+/)?.[0] || '?').join(',');
    const galleryAlts = Array.from(galleryImgs).map(i => i.getAttribute('alt') || '').slice(0,2).join(' | ');
    const visibleBadges = gallerySection ? Array.from(gallerySection.querySelectorAll('*')).filter(el => el.children.length === 0 && /PLACEHOLDER|badge/i.test(el.textContent || '')).length : -1;
    const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
    const oldKabaniJpg = document.querySelectorAll('img[src*=\"space-kabani.jpg\"]').length;
    return JSON.stringify({heroSrc, heroAlt, eyebrow, heading, intro, galleryCount: galleryImgs.length, gallerySrcs, galleryAlts, visibleBadges, horizontalOverflow, oldKabaniJpg}, null, 2);
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
agent-browser screenshot --session "$SESSION" /tmp/render/kabani-hero-1440.jpg
echo "saved /tmp/render/kabani-hero-1440.jpg"

echo ""
echo "=== GALLERY (full) ==="
agent-browser eval --session "$SESSION" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (g) g.scrollIntoView({block:"start"}); return "ok"; })()' >/dev/null
sleep 4
agent-browser screenshot --session "$SESSION" --full /tmp/render/kabani-fullpage-1440.jpg
# Compute gallery bounding box and crop
agent-browser eval --session "$SESSION" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (!g) return "NO GAL"; const r = g.getBoundingClientRect(); return JSON.stringify({top: r.top + window.scrollY, height: r.height, width: r.width}); })()'

echo ""
echo "=== CONSOLE ==="
agent-browser console --session "$SESSION" 2>/dev/null | grep -iE "error|warning" | grep -v "React DevTools\|HMR" | head -20

agent-browser close --session "$SESSION" >/dev/null 2>&1
echo "=== DONE ==="
