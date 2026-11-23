#!/bin/bash
# P0 Phase 3+5: Verify preview through Caddy proxy (port 81) for all 14 required routes,
# plus direct (port 3000) hero/gallery URL extraction for the 3 protected spaces.
set -u
cd /home/z/my-project

ROUTES=(
  "/"
  "/spaces"
  "/spaces/helipad"
  "/spaces/vip-dining"
  "/spaces/lake-area"
  "/spaces/periyar"
  "/spaces/nila"
  "/spaces/kabani"
  "/spaces/boardroom"
  "/spaces/hospitality"
  "/business"
  "/celebrations"
  "/weddings"
  "/experiences"
)

echo "============================================"
echo "Phase 3+5: Route health via Caddy proxy :81"
echo "============================================"
PASS=0
FAIL=0
for r in "${ROUTES[@]}"; do
  CODE=$(curl -s -o /tmp/p0_route.html -w "%{http_code}" --connect-timeout 3 --max-time 15 "http://localhost:81$r" 2>/dev/null || echo "000")
  BYTES=$(wc -c < /tmp/p0_route.html 2>/dev/null || echo 0)
  HAS_VIJAYA=$(grep -c -i "vijaya" /tmp/p0_route.html 2>/dev/null || echo 0)
  HAS_PLACEHOLDER=$(grep -c -i "PLACEHOLDER VISUAL" /tmp/p0_route.html 2>/dev/null || echo 0)
  if [ "$CODE" = "200" ] && [ "$HAS_VIJAYA" -gt 0 ]; then
    echo "  OK  $r  HTTP:$CODE  bytes:$BYTES  vijaya:$HAS_VIJAYA  placeholder:$HAS_PLACEHOLDER"
    PASS=$((PASS+1))
  else
    echo "  FAIL $r  HTTP:$CODE  bytes:$BYTES  vijaya:$HAS_VIJAYA  placeholder:$HAS_PLACEHOLDER"
    FAIL=$((FAIL+1))
  fi
done
echo "--------------------------------------------"
echo "Routes: $PASS pass, $FAIL fail (of ${#ROUTES[@]})"

echo ""
echo "============================================"
echo "Phase 4: Protected space hero+gallery URLs"
echo "============================================"
for slug in helipad vip-dining lake-area; do
  echo "--- /spaces/$slug ---"
  curl -s --max-time 15 "http://localhost:81/spaces/$slug" -o /tmp/p0_$slug.html
  # Extract hero image URL (first next/image fill on the page is typically the hero)
  HERO=$(python3 -c "
import re,sys
html=open('/tmp/p0_$slug.html').read()
# find first /_next/image?url=%2Fmedia%2F... 
m=re.search(r'/_next/image\?url=([^&\"\\s]+)', html)
if m:
  from urllib.parse import unquote
  print(unquote(m.group(1)))
else:
  print('NONE')
")
  echo "  hero: $HERO"
  # Count gallery images (all /_next/image?url=%2Fmedia%2F... occurrences, dedupe by url)
  GAL=$(python3 -c "
import re
from urllib.parse import unquote
html=open('/tmp/p0_$slug.html').read()
urls=re.findall(r'/_next/image\?url=([^&\"\\s]+)', html)
seen=[]
for u in urls:
  d=unquote(u)
  if d.startswith('/media/') and d not in seen:
    seen.append(d)
print(len(seen))
for s in seen: print('   ',s)
")
  echo "  gallery (unique media urls):"
  echo "$GAL"
done
