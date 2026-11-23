#!/bin/bash
# Visible 360°/Virtual Tour text audit — uses browser innerText (only what users see)
set -u
cd /home/z/my-project

PAGES="/ /weddings /business /celebrations /experiences /spaces /spaces/helipad /spaces/vip-dining /spaces/lake-area /spaces/periyar /spaces/nila /spaces/kabani /spaces/boardroom /spaces/hospitality /global-desk /faq /plan-your-event /check-your-date /gallery /about /contact"

echo "===VISIBLE 360°/VIRTUAL TOUR TEXT AUDIT (browser innerText)==="
TOTAL_FOUND=0
for r in $PAGES; do
  agent-browser open "http://localhost:81$r" 2>&1 | tail -0
  sleep 0.6
  RESULT=$(agent-browser eval "(() => { const t = document.body.innerText; const hits = []; const patterns = [/360°/, /360 View/i, /View 360/i, /Explore 360/i, /Explore in 360/i, /Virtual Tour/i, /Take a Virtual Tour/i, /Panorama/i, /Panoramic View/i, /Interactive Tour/i, /Enter 360/i, /Walk.*360/i, /Open 360/i, /360 Tour/i, /360 Experience/i, /360 Venue/i]; for (const p of patterns) { const m = t.match(p); if (m) hits.push(m[0]); } const links360 = Array.from(document.querySelectorAll('a[href*=\"360-tour\"], a[href*=\"/360\"]')).length; return JSON.stringify({ hits: [...new Set(hits)], links360 }); })()" 2>&1 | tail -1)
  HIT=$(echo "$RESULT" | python3 -c "import sys,json; d=json.loads(sys.stdin.read().strip().strip('\"').replace('\\\\\"','\"')); print(d.get('hits',[]), 'links:', d.get('links360',0))" 2>/dev/null || echo "parse-err")
  printf "  %-30s %s\n" "$r" "$HIT"
done
echo "===DONE==="
