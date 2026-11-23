#!/usr/bin/env bash
# All-in-one: start dev server, wait, run all tests, capture screenshots
set -u
cd /home/z/my-project

# Kill any existing next processes
pkill -f "next" 2>/dev/null
sleep 2

# Start dev server with setsid for persistence
nohup setsid ./node_modules/.bin/next dev -p 3000 > dev.log 2>&1 < /dev/null &
disown
SERVER_PID=$!
echo "Started server PID: $SERVER_PID"

# Wait for server to be ready
echo "Waiting for server..."
for i in $(seq 1 30); do
  if ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "Server listening after ${i}s"
    break
  fi
  sleep 1
done

# Extra wait for compilation
sleep 5

# Run all curl tests
echo ""
echo "=== CURL TESTS ==="
echo "BALLROOM REDIRECT:"
curl -s -o /dev/null -w "  HTTP %{http_code} redirect=%{redirect_url}\n" http://localhost:3000/spaces/ballroom
echo "HOSPITALITY PAGE:"
curl -s -o /tmp/hosp.html -w "  HTTP %{http_code} size=%{size_download}\n" http://localhost:3000/spaces/hospitality
echo "HOME PAGE:"
curl -s -o /tmp/home.html -w "  HTTP %{http_code} size=%{size_download}\n" http://localhost:3000/
echo "SPACES PAGE:"
curl -s -o /tmp/spaces.html -w "  HTTP %{http_code} size=%{size_download}\n" http://localhost:3000/spaces

# Verify gallery order from HTML
echo ""
echo "=== GALLERY ORDER VERIFICATION ==="
python3 -c "
import re
with open('/tmp/hosp.html') as f: html = f.read()
hero_match = re.search(r'kenburns[^<]*<img[^>]*src=\"[^\"]*VICC-(\d+)', html)
print(f'Hero: VICC-{hero_match.group(1) if hero_match else \"?\"} (expected 02)')
vc_pos = html.find('Viewed Closely')
next_headings = ['Film &amp; Showreel', 'Related Stories', 'Availability', 'Also Consider']
next_pos = len(html)
for h in next_headings:
    p = html.find(h, vc_pos)
    if p > 0 and p < next_pos:
        next_pos = p
gallery_section = html[vc_pos:next_pos]
seen = []
for m in re.finditer(r'VICC-(\d+)', gallery_section):
    n = m.group(1)
    if n not in seen:
        seen.append(n)
print(f'Gallery order: {seen}')
print(f'Expected:      [\"01\", \"03\", \"05\", \"06\", \"07\", \"08\", \"09\", \"10\"]')
print(f'Match: {seen == [\"01\", \"03\", \"05\", \"06\", \"07\", \"08\", \"09\", \"10\"]}')
all_vicc = sorted(set(re.findall(r'VICC-(\d+)', html)), key=lambda x: int(x))
print(f'All VICC files in page: {all_vicc}')
print(f'04 present: {\"04\" in all_vicc} (should be False)')
print(f'Ballroom text: {\"ballroom\" in html.lower()} (should be False)')
print(f'Old space-ballroom.jpg: {\"space-ballroom.jpg\" in html} (should be False)')
"

# Check home + spaces pages for Ballroom references
echo ""
echo "=== HOME/SPACES BALLROOM CHECK ==="
echo "Home page 'ballroom' count: $(grep -ci 'ballroom' /tmp/home.html) (should be 0)"
echo "Spaces page 'ballroom' count: $(grep -ci 'ballroom' /tmp/spaces.html) (should be 0)"
echo "Home page 'hospitality' count: $(grep -ci 'hospitality' /tmp/home.html)"
echo "Spaces page 'hospitality' count: $(grep -ci 'hospitality' /tmp/spaces.html)"

# Browser tests with agent-browser
echo ""
echo "=== BROWSER VISUAL TESTS ==="
agent-browser close --session "hosp-vis" >/dev/null 2>&1 || true

# Desktop 1440x900
agent-browser open "http://localhost:3000/spaces/hospitality" --session "hosp-vis" >/dev/null 2>&1
agent-browser set viewport 1440 900 --session "hosp-vis" >/dev/null 2>&1
agent-browser open "http://localhost:3000/spaces/hospitality" --session "hosp-vis" >/dev/null 2>&1
sleep 8
agent-browser eval --session "hosp-vis" '(() => {
  const heroImg = document.querySelector("section img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? (heroImg.getAttribute("src") || "").match(/VICC-\d+/)?.[0] : "NO HERO";
  const heroAlt = heroImg ? heroImg.getAttribute("alt") : "?";
  const eyebrow = document.querySelector("section p.eyebrow")?.textContent || "?";
  const heading = document.querySelector("section h1")?.textContent || "?";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const gallerySrcs = Array.from(galleryImgs).map(i => (i.getAttribute("src") || "").match(/VICC-\d+/)?.[0] || "?").join(",");
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc, heroAlt, eyebrow, heading, galleryCount: galleryImgs.length, gallerySrcs, horizontalOverflow}, null, 2);
})()
'
agent-browser screenshot --session "hosp-vis" /tmp/render/hosp-hero-1440.jpg
echo "Saved hosp-hero-1440.jpg"

# Scroll to gallery and capture
agent-browser eval --session "hosp-vis" '(() => { const g = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || "")); if (g) g.scrollIntoView({block:"start"}); return "ok"; })()' >/dev/null
sleep 4
agent-browser screenshot --session "hosp-vis" --full /tmp/render/hosp-fullpage-1440.jpg
echo "Saved hosp-fullpage-1440.jpg"

# Mobile 390x844
agent-browser open "http://localhost:3000/spaces/hospitality" --session "hosp-vis" >/dev/null 2>&1
agent-browser set viewport 390 844 --session "hosp-vis" >/dev/null 2>&1
agent-browser open "http://localhost:3000/spaces/hospitality" --session "hosp-vis" >/dev/null 2>&1
sleep 6
agent-browser eval --session "hosp-vis" '(() => {
  const heroImg = document.querySelector("section img[data-nimg=\"fill\"]");
  const heroSrc = heroImg ? (heroImg.getAttribute("src") || "").match(/VICC-\d+/)?.[0] : "NO HERO";
  const gallerySection = Array.from(document.querySelectorAll("section")).find(s => /Gallery/.test(s.querySelector("p.eyebrow-dark")?.textContent || ""));
  const galleryImgs = gallerySection ? gallerySection.querySelectorAll("img[data-nimg=\"fill\"]") : [];
  const horizontalOverflow = document.documentElement.scrollWidth - window.innerWidth;
  return JSON.stringify({heroSrc, galleryCount: galleryImgs.length, horizontalOverflow}, null, 2);
})()
'
agent-browser screenshot --session "hosp-vis" /tmp/render/hosp-mobile-hero-390.jpg
echo "Saved hosp-mobile-hero-390.jpg"

# Console check
echo ""
echo "=== CONSOLE (filtered) ==="
agent-browser console --session "hosp-vis" 2>/dev/null | grep -iE "error|warning" | grep -v "React DevTools\|HMR\|Download the React" | head -10

agent-browser close --session "hosp-vis" >/dev/null 2>&1
echo ""
echo "=== DONE ==="
