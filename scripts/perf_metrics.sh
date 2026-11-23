#!/usr/bin/env bash
# Measure the homepage's critical first-paint transferred bytes (gzip):
# HTML + all referenced JS chunks + CSS + fonts. The hero video is excluded
# (it is deferred past LCP and measured separately).
cd /home/z/my-project
BASE="http://localhost:81"

echo "=== HOMEPAGE CRITICAL PAYLOAD (gzip) ==="
HTML=$(curl -s -H "Accept-Encoding: gzip" -o /tmp/h.html -w "%{size_download}" "$BASE/")
printf "  HTML (gzip):          %8d bytes (%5.1f KB)\n" "$HTML" "$(echo "scale=1;$HTML/1024"|tail -1|python3 -c 'import sys;print(round(eval(sys.stdin.read().split()[0])/1,1))' 2>/dev/null || echo $((HTML/1024)))"

# Extract referenced JS + CSS chunks from the served HTML
CHUNKS=$(grep -oE '/_next/static/[^"]+\.(js|css)' /tmp/h.html | sort -u)
JS_TOTAL=0; CSS_TOTAL=0; JS_N=0; CSS_N=0
for c in $CHUNKS; do
  sz=$(curl -s -H "Accept-Encoding: gzip" -o /dev/null -w "%{size_download}" "$BASE$c")
  case "$c" in
    *.js) JS_TOTAL=$((JS_TOTAL+sz)); JS_N=$((JS_N+1));;
    *.css) CSS_TOTAL=$((CSS_TOTAL+sz)); CSS_N=$((CSS_N+1));;
  esac
done
printf "  JS  (%d chunks, gzip): %8d bytes (%5.1f KB)\n" "$JS_N" "$JS_TOTAL" "$((JS_TOTAL/1024)).$((JS_TOTAL%1024*10/1024))"
printf "  CSS (%d chunks, gzip): %8d bytes (%5.1f KB)\n" "$CSS_N" "$CSS_TOTAL" "$((CSS_TOTAL/1024)).$((CSS_TOTAL%1024*10/1024))"

# Fonts (4 woff2, 2 preloaded)
FONT_TOTAL=0
for f in $(grep -oE '/_next/static/media/[^"]+\.woff2' /tmp/h.html | sort -u); do
  sz=$(curl -s -o /dev/null -w "%{size_download}" "$BASE$f")
  FONT_TOTAL=$((FONT_TOTAL+sz))
done
printf "  Fonts (woff2):         %8d bytes (%5.1f KB)\n" "$FONT_TOTAL" "$((FONT_TOTAL/1024)).$((FONT_TOTAL%1024*10/1024))"

# Hero poster (next/image optimized — request the optimizer URL from the page)
POSTER_URL=$(grep -oE 'image\?url=%2Fmedia%2Fhero-video-poster[^"]*' /tmp/h.html | head -1)
if [ -n "$POSTER_URL" ]; then
  POSTER_SZ=$(curl -s -H "Accept-Encoding: gzip" -o /dev/null -w "%{size_download}" "$BASE/_next/$POSTER_URL")
  printf "  Hero poster (AVIF opt):%8d bytes (%5.1f KB)\n" "$POSTER_SZ" "$((POSTER_SZ/1024)).$((POSTER_SZ%1024*10/1024))"
fi

CRIT=$((HTML+JS_TOTAL+CSS_TOTAL+FONT_TOTAL))
echo ""
printf "  CRITICAL PAYLOAD (gzip, excl. deferred video): %d bytes (%.1f KB)\n" "$CRIT" "$(python3 -c "print(round($CRIT/1024,1))")"

echo ""
echo "=== HERO VIDEO (deferred — loads AFTER LCP) ==="
D=$(curl -s -o /dev/null -w "%{size_download}" "$BASE/media/vijaya-hero-desktop.mp4")
M=$(curl -s -o /dev/null -w "%{size_download}" "$BASE/media/vijaya-hero-mobile.mp4")
printf "  Desktop variant: %d bytes (%.1f MB)\n" "$D" "$(python3 -c "print(round($D/1048576,2))")"
printf "  Mobile variant:  %d bytes (%.1f MB)\n" "$M" "$(python3 -c "print(round($M/1048576,2))")"
echo ""
echo "=== TOTAL JS BUNDLE (all chunks, raw) ==="
find .next/static -name "*.js" -type f -printf '%s\n' | awk '{s+=$1} END{printf "  %.1f MB raw across %d files\n", s/1048576, NR}'
echo "DONE"
