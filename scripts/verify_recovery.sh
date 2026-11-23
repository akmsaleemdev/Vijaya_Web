#!/usr/bin/env bash
# All-in-one recovery verification: server + assets + browser + regression
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
echo "=== DIRECT ASSET HTTP CHECK (URL-encoded) ==="
curl -s -o /dev/null -w "  Helipad VICC-10: HTTP %{http_code}\n" "http://localhost:3000/media/Helipad%20Section-VIJAYA%20International%20Convention%20Centre-VICC-10.webp"
curl -s -o /dev/null -w "  Helipad VICC-01: HTTP %{http_code}\n" "http://localhost:3000/media/Helipad%20Section-VIJAYA%20International%20Convention%20Centre-VICC-01.webp"
curl -s -o /dev/null -w "  VIP VICC-03:    HTTP %{http_code}\n" "http://localhost:3000/media/VIP%20Dining-VIJAYA%20International%20Convention%20Centre-VICC-03.webp"
curl -s -o /dev/null -w "  VIP VICC-01:    HTTP %{http_code}\n" "http://localhost:3000/media/VIP%20Dining-VIJAYA%20International%20Convention%20Centre-VICC-01.webp"

echo ""
echo "=== BROWSER VERIFICATION ==="
agent-browser close --session "recovery-vis" >/dev/null 2>&1 || true

# HELIPAD desktop
agent-browser open "http://localhost:3000/spaces/helipad" --session "recovery-vis" >/dev/null 2>&1
agent-browser set viewport 1440 900 --session "recovery-vis" >/dev/null 2>&1
agent-browser open "http://localhost:3000/spaces/helipad" --session "recovery-vis" >/dev/null 2>&1
sleep 10
echo "--- HELIPAD Desktop 1440x900 ---"
agent-browser eval --session "recovery-vis" '(() => {
  const heroImg = document.querySelector("section img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? (heroImg.getAttribute("src") || "").match(/VICC-\d+/)?.[0] : "NO HERO";
  const heroAlt = heroImg ? heroImg.getAttribute("alt") : "?";
  const heroLoaded = heroImg ? (heroImg.complete && heroImg.naturalWidth > 0) : false;
  const heading = document.querySelector("section h1")?.textContent || "?";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const galleryLoaded = Array.from(galleryImgs).filter(i => i.complete && i.naturalWidth > 0).length;
  const visibleBadges = Array.from(document.querySelectorAll("span.badge-placeholder")).filter(el => el.offsetParent !== null).length;
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  const brokenImgs = Array.from(document.querySelectorAll("img")).filter(i => i.complete && i.naturalWidth === 0).length;
  return JSON.stringify({heroSrc, heroAlt, heroLoaded, heading, galleryCount: galleryImgs.length, gallerySrcs, galleryLoaded, visibleBadges, brokenImgs, horizontalOverflow}, null, 2);
})()'
agent-browser screenshot --session "recovery-vis" /tmp/render/recovery-helipad-hero.jpg

# Lightbox test on helipad
agent-browser eval --session "recovery-vis" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (g) g.scrollIntoView({block:"start"}); return "ok"; })()' >/dev/null
sleep 4
agent-browser eval --session "recovery-vis" '(() => { const gal = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); const btn = gal.querySelector("button[aria-label^=\"Open image\"]"); if (!btn) return "NO BUTTON"; btn.click(); return "clicked"; })()'
sleep 2
agent-browser eval --session "recovery-vis" '(() => { const lb = document.querySelector("[role=\"dialog\"][aria-label=\"Image lightbox\"]"); if (!lb) return "NO LIGHTBOX"; const img = lb ? lb.querySelector("img") : null; return JSON.stringify({open: true, imgSrc: (img?.getAttribute("src") || "").match(/VICC-\d+/)?.[0], counter: lb.querySelector("div.absolute.bottom-6")?.textContent?.trim()}); })()'
agent-browser press Escape --session "recovery-vis" >/dev/null
sleep 1
agent-browser eval --session "recovery-vis" '(() => document.querySelector("[role=\"dialog\"]") ? "STILL OPEN" : "CLOSED")()'

# VIP DINING desktop
agent-browser open "http://localhost:3000/spaces/vip-dining" --session "recovery-vis" >/dev/null 2>&1
sleep 8
echo ""
echo "--- VIP-DINING Desktop 1440x900 ---"
agent-browser eval --session "recovery-vis" '(() => {
  const heroImg = document.querySelector("section img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? (heroImg.getAttribute("src") || "").match(/VICC-\d+/)?.[0] : "NO HERO";
  const heroAlt = heroImg ? heroImg.getAttribute("alt") : "?";
  const heroLoaded = heroImg ? (heroImg.complete && heroImg.naturalWidth > 0) : false;
  const heading = document.querySelector("section h1")?.textContent || "?";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const galleryLoaded = Array.from(galleryImgs).filter(i => i.complete && i.naturalWidth > 0).length;
  const visibleBadges = Array.from(document.querySelectorAll("span.badge-placeholder")).filter(el => el.offsetParent !== null).length;
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  const brokenImgs = Array.from(document.querySelectorAll("img")).filter(i => i.complete && i.naturalWidth === 0).length;
  return JSON.stringify({heroSrc, heroAlt, heroLoaded, heading, galleryCount: galleryImgs.length, gallerySrcs, galleryLoaded, visibleBadges, brokenImgs, horizontalOverflow}, null, 2);
})()'
agent-browser screenshot --session "recovery-vis" /tmp/render/recovery-vip-hero.jpg

# VIP gallery screenshot
agent-browser eval --session "recovery-vis" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (g) g.scrollIntoView({block:"start"}); return "ok"; })()' >/dev/null
sleep 4
agent-browser screenshot --session "recovery-vis" --full /tmp/render/recovery-vip-fullpage.jpg

# Mobile checks
echo ""
echo "--- Mobile 390x844 ---"
for ROUTE in "helipad" "vip-dining"; do
  agent-browser open "http://localhost:3000/spaces/$ROUTE" --session "recovery-vis" >/dev/null 2>&1
  agent-browser set viewport 390 844 --session "recovery-vis" >/dev/null 2>&1
  agent-browser open "http://localhost:3000/spaces/$ROUTE" --session "recovery-vis" >/dev/null 2>&1
  sleep 6
  agent-browser eval --session "recovery-vis" "(() => {
    const h = document.querySelector(\"section img[data-nimg=\\\"fill\\\"]\");
    const g = Array.from(document.querySelectorAll(\"section\")).find(s => /Gallery/.test(s.querySelector(\"p.eyebrow-dark\")?.textContent || \"\"));
    const gi = g ? g.querySelectorAll(\"img[data-nimg=\\\"fill\\\"]\") : [];
    return JSON.stringify({route: \"$ROUTE\", heroSrc: (h?.getAttribute(\"src\") || \"\").match(/VICC-\d+/)?.[0], heroLoaded: h ? (h.complete && h.naturalWidth > 0) : false, galleryCount: gi.length, horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth});
  })()"
done

# SPACES INDEX shared card check
echo ""
echo "--- SPACES INDEX (/spaces) card check ---"
agent-browser open "http://localhost:3000/spaces" --session "recovery-vis" >/dev/null 2>&1
agent-browser set viewport 1440 900 --session "recovery-vis" >/dev/null 2>&1
sleep 6
agent-browser eval --session "recovery-vis" '(() => {
  const cards = Array.from(document.querySelectorAll("a[href=\"/spaces/helipad\"], a[href=\"/spaces/vip-dining\"]"));
  return JSON.stringify(cards.map(c => {
    const img = c.querySelector("img[data-nimg=\"fill\"]");
    return {
      href: c.getAttribute("href"),
      title: c.textContent.replace(/Placeholder visual/g, "").trim().slice(0, 40),
      imgSrc: (img?.getAttribute("src") || "").slice(0, 100),
      imgLoaded: img ? (img.complete && img.naturalWidth > 0) : false
    };
  }), null, 2);
})()'

# HOME page check
echo ""
echo "--- HOME page cards ---"
agent-browser open "http://localhost:3000/" --session "recovery-vis" >/dev/null 2>&1
sleep 6
agent-browser eval --session "recovery-vis" '(() => {
  const links = Array.from(document.querySelectorAll("a[href*=\"vip-dining\"], a[href*=\"helipad\"]"));
  return JSON.stringify(links.map(a => {
    const img = a.querySelector("img[data-nimg=\"fill\"]");
    return {
      href: a.getAttribute("href"),
      imgSrc: (img?.getAttribute("src") || "").match(/VIP%20Dining[^&]*VICC-\d+|Helipad%20Section[^&]*VICC-\d+/)?.[0] || (img?.getAttribute("src") || "").slice(0, 80),
      imgLoaded: img ? (img.complete && img.naturalWidth > 0) : false
    };
  }), null, 2);
})()'

echo ""
echo "=== CONSOLE ERRORS ==="
agent-browser console --session "recovery-vis" 2>/dev/null | grep -iE "error" | grep -v "React DevTools\|HMR\|Download the React" | head -5

agent-browser close --session "recovery-vis" >/dev/null 2>&1
echo ""
echo "=== DONE ==="
