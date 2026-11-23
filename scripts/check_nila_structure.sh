#!/usr/bin/env bash
# Page-level structural checks for /spaces/nila
set -u
SESSION="nila-check"
URL="http://localhost:3000/spaces/nila"
agent-browser close --session "$SESSION" >/dev/null 2>&1 || true

echo "=== DESKTOP 1440x900 ==="
agent-browser open "$URL" --session "$SESSION" --viewport "1440x900" >/dev/null 2>&1
sleep 5
agent-browser eval --session "$SESSION" '(() => {
  const heroImg = document.querySelector("section.relative.overflow-hidden img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? heroImg.getAttribute("src") : "NO HERO";
  const eyebrow = document.querySelector("section p.eyebrow")?.textContent || "NO EYEBROW";
  const heading = document.querySelector("section h1")?.textContent || "NO HEADING";
  const intro = document.querySelector("section p.lede")?.textContent?.trim()?.slice(0,60) || "NO INTRO";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const galleryAlts = Array.from(galleryImgs).map(i => i.getAttribute("alt") || "").slice(0,3).map(a => a.slice(0,50)).join(" | ");
  const visibleBadges = Array.from(document.querySelectorAll("section.py-16.md\\:py-24 *")).filter(el => el.children.length === 0 && /PLACEHOLDER|badge/i.test(el.textContent || "")).length;
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc: heroSrc?.slice(0,90), eyebrow, heading, intro, galleryCount: galleryImgs.length, gallerySrcs, galleryAlts, visibleBadges, horizontalOverflow}, null, 2);
})()'

echo ""
echo "=== DESKTOP 1920x1080 ==="
agent-browser open "$URL" --session "$SESSION" --viewport "1920x1080" >/dev/null 2>&1
sleep 4
agent-browser eval --session "$SESSION" '(() => {
  const heroImg = document.querySelector("section.relative.overflow-hidden img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? heroImg.getAttribute("src") : "NO HERO";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc: heroSrc?.slice(0,90), galleryCount: galleryImgs.length, gallerySrcs, horizontalOverflow}, null, 2);
})()'

echo ""
echo "=== MOBILE 390x844 ==="
agent-browser open "$URL" --session "$SESSION" --viewport "390x844" >/dev/null 2>&1
sleep 4
agent-browser eval --session "$SESSION" '(() => {
  const heroImg = document.querySelector("section.relative.overflow-hidden img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? heroImg.getAttribute("src") : "NO HERO";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc: heroSrc?.slice(0,90), galleryCount: galleryImgs.length, gallerySrcs, horizontalOverflow}, null, 2);
})()'

echo ""
echo "=== MOBILE 430x932 ==="
agent-browser open "$URL" --session "$SESSION" --viewport "430x932" >/dev/null 2>&1
sleep 4
agent-browser eval --session "$SESSION" '(() => {
  const heroImg = document.querySelector("section.relative.overflow-hidden img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? heroImg.getAttribute("src") : "NO HERO";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc: heroSrc?.slice(0,90), galleryCount: galleryImgs.length, gallerySrcs, horizontalOverflow}, null, 2);
})()'

echo ""
echo "=== HERO CONTRAST CHECK (1440x900) ==="
agent-browser open "$URL" --session "$SESSION" --viewport "1440x900" >/dev/null 2>&1
sleep 5
agent-browser screenshot --session "$SESSION" --path /tmp/render/nila-hero-contrast.jpg >/dev/null 2>&1
echo "saved /tmp/render/nila-hero-contrast.jpg"

agent-browser close --session "$SESSION" >/dev/null 2>&1
echo "=== DONE ==="
