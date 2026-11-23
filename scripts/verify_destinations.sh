#!/usr/bin/env bash
# Experiences + Home destination section verification across viewports
set -u
SESSION="dest-verify"
agent-browser close --session "$SESSION" >/dev/null 2>&1 || true

check_experiences() {
  local W=$1; local H=$2; local NAME=$3
  echo "=== EXPERIENCES ${NAME}  ${W}x${H} ==="
  agent-browser open "http://localhost:3000/experiences" --session "$SESSION" >/dev/null 2>&1
  agent-browser set viewport "$W" "$H" --session "$SESSION" >/dev/null 2>&1
  agent-browser open "http://localhost:3000/experiences" --session "$SESSION" >/dev/null 2>&1
  sleep 6
  agent-browser eval --session "$SESSION" "(() => {
    const heroImg = document.querySelector('section.relative.overflow-hidden img[data-nimg=\"fill\"]');
    const heroSrc = heroImg ? (heroImg.getAttribute('src') || '').match(/Destinations[^&]*/)?.[0] : 'NO HERO';
    const heroAlt = heroImg ? heroImg.getAttribute('alt') : '?';
    const eyebrow = document.querySelector('section p.eyebrow')?.textContent || '?';
    const heading = document.querySelector('section h1')?.textContent || '?';
    const articles = Array.from(document.querySelectorAll('article[id]'));
    const ids = articles.map(a => a.id);
    const titles = articles.map(a => a.querySelector('h2')?.textContent || '?');
    const articleImgs = articles.map(a => {
      const img = a.querySelector('img[data-nimg=\"fill\"]');
      return (img?.getAttribute('src') || '').match(/Destinations[^&]*\.webp/)?.[0] || '?';
    });
    const accessibilityCount = ids.filter(id => /accessibility/i.test(id)).length;
    const visiblePlaceholderBadges = Array.from(document.querySelectorAll('span.badge-placeholder')).filter(el => el.offsetParent !== null).length;
    const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
    return JSON.stringify({heroSrc, heroAlt, eyebrow, heading, articleCount: articles.length, ids, titles, articleImgs, accessibilityCount, visiblePlaceholderBadges, horizontalOverflow}, null, 2);
  })()"
  echo ""
}

check_home_dest() {
  local W=$1; local H=$2; local NAME=$3
  echo "=== HOME DEST ${NAME}  ${W}x${H} ==="
  agent-browser open "http://localhost:3000/" --session "$SESSION" >/dev/null 2>&1
  agent-browser set viewport "$W" "$H" --session "$SESSION" >/dev/null 2>&1
  agent-browser open "http://localhost:3000/" --session "$SESSION" >/dev/null 2>&1
  sleep 6
  agent-browser eval --session "$SESSION" "(() => {
    // Find the destination section by heading 'Beyond the Halls'
    const destSection = Array.from(document.querySelectorAll('section')).find(s => /Beyond the Halls/.test(s.textContent || ''));
    if (!destSection) return 'NO DEST SECTION';
    const cards = Array.from(destSection.querySelectorAll('a[href^=\"/experiences#\"]'));
    const cardData = cards.map(c => {
      const img = c.querySelector('img[data-nimg=\"fill\"]');
      const label = c.querySelector('p')?.textContent || '?';
      return {
        label,
        imgSrc: (img?.getAttribute('src') || '').match(/Destinations[^&]*\.webp/)?.[0] || '?',
        alt: img?.getAttribute('alt') || '?'
      };
    });
    const visiblePlaceholderBadges = Array.from(destSection.querySelectorAll('span.badge-placeholder')).filter(el => el.offsetParent !== null).length;
    const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
    return JSON.stringify({cardCount: cards.length, cardData, visiblePlaceholderBadges, horizontalOverflow}, null, 2);
  })()"
  echo ""
}

check_experiences 1440 900 "desktop-1440"
check_experiences 1920 1080 "desktop-1920"
check_experiences 768 1024 "tablet-768"
check_experiences 390 844 "mobile-390"

check_home_dest 1440 900 "desktop-1440"
check_home_dest 390 844 "mobile-390"

echo "=== EXPERIENCES HERO SCREENSHOT (1440x900) ==="
agent-browser open "http://localhost:3000/experiences" --session "$SESSION" >/dev/null 2>&1
agent-browser set viewport 1440 900 --session "$SESSION" >/dev/null 2>&1
sleep 6
agent-browser screenshot --session "$SESSION" /tmp/render/exp-hero-1440.jpg
echo "saved exp-hero-1440.jpg"

echo ""
echo "=== EXPERIENCES FULL PAGE (1440x900) ==="
agent-browser screenshot --session "$SESSION" --full /tmp/render/exp-fullpage-1440.jpg
echo "saved exp-fullpage-1440.jpg"

echo ""
echo "=== HOME DESTINATION SECTION (1440x900) ==="
agent-browser open "http://localhost:3000/" --session "$SESSION" >/dev/null 2>&1
sleep 6
agent-browser eval --session "$SESSION" '(() => { const s = Array.from(document.querySelectorAll("section")).find(s => /Beyond the Halls/.test(s.textContent || "")); if (s) s.scrollIntoView({block:"start"}); return "ok"; })()' >/dev/null
sleep 3
agent-browser screenshot --session "$SESSION" /tmp/render/home-dest-1440.jpg
echo "saved home-dest-1440.jpg"

echo ""
echo "=== CONSOLE (filtered) ==="
agent-browser console --session "$SESSION" 2>/dev/null | grep -iE "error|warning" | grep -v "React DevTools\|HMR" | head -10

agent-browser close --session "$SESSION" >/dev/null 2>&1
echo "=== DONE ==="
