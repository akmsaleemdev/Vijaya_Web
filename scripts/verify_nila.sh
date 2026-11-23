#!/usr/bin/env bash
# Verify /spaces/nila across 4 viewports — capture screenshots + console logs
set -u
SESSION="nila-verify"
URL="http://localhost:3000/spaces/nila"
OUT=/tmp/render
mkdir -p "$OUT"

agent-browser session id --scope worktree --prefix task >/dev/null 2>&1
agent-browser close --session "$SESSION" >/dev/null 2>&1 || true

declare -a W=(1440 1920 390 430)
declare -a H=(900 1080 844 932)
declare -a NAMES=(desktop-1440 desktop-1920 mobile-390 mobile-430)

for i in 0 1 2 3; do
  W_=${W[$i]}; H_=${H[$i]}; NAME=${NAMES[$i]}
  echo "=== $NAME  ${W_}x${H_} ==="
  agent-browser open "$URL" --session "$SESSION" --viewport "${W_}x${H_}" >/dev/null 2>&1
  # Wait for hero image + gallery to load
  sleep 4
  # Scroll gallery into view so lazy images start loading
  agent-browser eval --session "$SESSION" '
    const gal = document.querySelector("section.py-16.md\\:py-24");
    if (gal) gal.scrollIntoView({behavior:"instant", block:"start"});
    "scrolled"
  ' >/dev/null 2>&1
  sleep 3
  # Scroll a bit more to ensure all 8 gallery images load
  agent-browser eval --session "$SESSION" '
    window.scrollBy(0, 800);
    "ok"
  ' >/dev/null 2>&1
  sleep 2
  agent-browser screenshot --session "$SESSION" --full-page --path "$OUT/nila-${NAME}-full.jpg" >/dev/null 2>&1 && echo "  saved full-page: nila-${NAME}-full.jpg"
  # Reset to top and capture just hero
  agent-browser eval --session "$SESSION" 'window.scrollTo(0,0); "top"' >/dev/null 2>&1
  sleep 1
  agent-browser screenshot --session "$SESSION" --path "$OUT/nila-${NAME}-hero.jpg" >/dev/null 2>&1 && echo "  saved hero: nila-${NAME}-hero.jpg"
done

echo ""
echo "=== Console errors across all viewports ==="
agent-browser console --session "$SESSION" 2>/dev/null | head -50 || echo "(no console command)"

echo ""
echo "=== Page-level checks at 1440x900 ==="
agent-browser open "$URL" --session "$SESSION" --viewport "1440x900" >/dev/null 2>&1
sleep 4
agent-browser eval --session "$SESSION" '
  const heroImg = document.querySelector("section.relative img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? heroImg.getAttribute("src") : "NO HERO IMG";
  const eyebrow = document.querySelector("section p.eyebrow")?.textContent || "NO EYEBROW";
  const heading = document.querySelector("section h1")?.textContent || "NO HEADING";
  const galleryImgs = Array.from(document.querySelectorAll("section.py-16.md\\:py-24 img[data-nimg=\"fill\"]"));
  const galleryCount = galleryImgs.length;
  const gallerySrcs = galleryImgs.map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const placeholderBadges = Array.from(document.querySelectorAll("*")).filter(el => el.children.length === 0 && /PLACEHOLDER VISUAL/i.test(el.textContent || "")).length;
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc: heroSrc?.slice(0,80), eyebrow, heading, galleryCount, gallerySrcs, placeholderBadges, horizontalOverflow}, null, 2);
'

echo ""
echo "=== Mobile checks at 390x844 ==="
agent-browser open "$URL" --session "$SESSION" --viewport "390x844" >/dev/null 2>&1
sleep 4
agent-browser eval --session "$SESSION" '
  const heroImg = document.querySelector("section.relative img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? heroImg.getAttribute("src") : "NO HERO IMG";
  const galleryImgs = Array.from(document.querySelectorAll("section.py-16.md\\:py-24 img[data-nimg=\"fill\"]"));
  const galleryCount = galleryImgs.length;
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc: heroSrc?.slice(0,80), galleryCount, horizontalOverflow}, null, 2);
'

agent-browser close --session "$SESSION" >/dev/null 2>&1
echo ""
echo "=== DONE ==="
