#!/bin/bash
# P1 Phase 9: Comprehensive verification after Journal/Stories removal.
set -u
cd /home/z/my-project

echo "============================================"
echo "PART A: Route HTTP status (via Caddy :81)"
echo "============================================"
declare -A EXPECT
EXPECT["/"]=200
EXPECT["/spaces"]=200
EXPECT["/spaces/helipad"]=200
EXPECT["/spaces/vip-dining"]=200
EXPECT["/spaces/lake-area"]=200
EXPECT["/spaces/periyar"]=200
EXPECT["/spaces/nila"]=200
EXPECT["/spaces/kabani"]=200
EXPECT["/spaces/boardroom"]=200
EXPECT["/spaces/hospitality"]=200
EXPECT["/business"]=200
EXPECT["/celebrations"]=200
EXPECT["/weddings"]=200
EXPECT["/experiences"]=200
EXPECT["/stories"]=404
EXPECT["/journal"]=404
EXPECT["/stories/setting-the-stage-a-wedding-transformation"]=404
EXPECT["/stories/planning-an-nri-wedding-from-the-gcc"]=404
EXPECT["/stories/designing-a-conference-guests-remember"]=404

PASS=0; FAIL=0
for route in "${!EXPECT[@]}"; do
  CODE=$(curl -s -o /tmp/p1_route.html -w "%{http_code}" --max-time 15 "http://localhost:81$route" 2>/dev/null)
  WANT=${EXPECT[$route]}
  if [ "$CODE" = "$WANT" ]; then
    printf "  ✓ %-55s HTTP:%s (expected %s)\n" "$route" "$CODE" "$WANT"
    PASS=$((PASS+1))
  else
    printf "  ✗ %-55s HTTP:%s (expected %s)\n" "$route" "$CODE" "$WANT"
    FAIL=$((FAIL+1))
  fi
done
echo "  ────────────────────────────────────────────"
echo "  $PASS/${#EXPECT[@]} pass, $FAIL fail"

echo ""
echo "============================================"
echo "PART B: Feature-text absence check"
echo "(no rendered 'Stories From VIJAYA' / 'VIJAYA Journal' / 'Read the journal' / 'Related Stories' / 'From the VIJAYA Journal')"
echo "============================================"
CHECK_ROUTES=("/" "/spaces" "/spaces/helipad" "/spaces/vip-dining" "/spaces/lake-area" "/spaces/periyar" "/spaces/nila" "/spaces/kabani" "/spaces/boardroom" "/spaces/hospitality" "/business" "/celebrations" "/weddings" "/experiences")
TEXT_PASS=0; TEXT_FAIL=0
for r in "${CHECK_ROUTES[@]}"; do
  curl -s --max-time 15 "http://localhost:81$r" -o /tmp/p1_text.html
  # Check for the 5 feature-specific strings (case-insensitive)
  HITS=$(python3 -c "
import re
html=open('/tmp/p1_text.html').read()
# Only count RENDERED text, not JS source code. Use a simple heuristic:
# look for these strings NOT inside a self.__next_f.push payload.
# Easier: strip out all <script>...</script> blocks first, then search.
clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
patterns = ['Stories From VIJAYA','VIJAYA Journal','Read the journal','Related Stories','From the VIJAYA Journal','Wedding Stories From VIJAYA']
total=0
for p in patterns:
    total += len(re.findall(re.escape(p), clean, re.IGNORECASE))
print(total)
")
  if [ "$HITS" = "0" ]; then
    printf "  ✓ %-30s 0 feature-text hits\n" "$r"
    TEXT_PASS=$((TEXT_PASS+1))
  else
    printf "  ✗ %-30s %s feature-text hits REMAIN\n" "$r" "$HITS"
    TEXT_FAIL=$((TEXT_FAIL+1))
  fi
done
echo "  ────────────────────────────────────────────"
echo "  $TEXT_PASS/${#CHECK_ROUTES[@]} pass, $TEXT_FAIL fail"

echo ""
echo "============================================"
echo "PART C: Stories nav link absence in header/footer"
echo "============================================"
curl -s --max-time 15 "http://localhost:81/" -o /tmp/p1_home.html
NAV_HREF=$(python3 -c "
import re
html=open('/tmp/p1_home.html').read()
clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
# Find any <a href=\"/stories...\">
hits = re.findall(r'<a[^>]+href=\"/stories[^\"]*\"[^>]*>([^<]*)</a>', clean)
print(len(hits))
for h in hits: print('  nav text:', repr(h))
")
echo "  Home page <a href=\"/stories...\"> count: $NAV_HREF"

echo ""
echo "============================================"
echo "PART D: Protected media still rendering"
echo "============================================"
for slug in helipad vip-dining lake-area; do
  curl -s --max-time 15 "http://localhost:81/spaces/$slug" -o /tmp/p1_$slug.html
  python3 -c "
import re
from urllib.parse import unquote
html=open('/tmp/p1_$slug.html').read()
urls=re.findall(r'/_next/image\?url=([^&\"\\s]+)', html)
seen=[]
for u in urls:
  d=unquote(u)
  if d.startswith('/media/') and d not in seen:
    seen.append(d)
expected={'helipad':'VICC-10','vip-dining':'VICC-03','lake-area':'VICC-03'}['$slug']
hero_ok = any(expected in s for s in seen)
print(f'  /spaces/$slug: {len(seen)} media URLs, hero_has_{expected}: {hero_ok}')
"
done

echo ""
echo "============================================"
echo "PART E: Sitemap no longer contains /stories"
echo "============================================"
curl -s --max-time 15 "http://localhost:81/sitemap.xml" -o /tmp/p1_sitemap.xml
STORIES_IN_SITEMAP=$(grep -c "/stories" /tmp/p1_sitemap.xml 2>/dev/null || echo 0)
echo "  /stories occurrences in sitemap.xml: $STORIES_IN_SITEMAP (expected 0)"
SPACES_IN_SITEMAP=$(grep -c "/spaces/" /tmp/p1_sitemap.xml 2>/dev/null || echo 0)
echo "  /spaces/ occurrences in sitemap.xml: $SPACES_IN_SITEMAP (should still be present)"
