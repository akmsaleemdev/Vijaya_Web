#!/bin/bash
# Comprehensive final verification — all checks inside one shell session.
cd /home/z/my-project

# Start dev server
setsid nohup bun run dev </dev/null > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for readiness
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server ready: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3000/)"

echo "== Site pages =="
for p in / /about /spaces /spaces/nila /spaces/periyar /experiences /360-tour /gallery /stories /stories/planning-an-nri-wedding-from-the-gcc /weddings /business /celebrations /plan-your-event /venue-visit /check-your-date /global-desk /contact /faq /booking-policy /cancellation-policy /privacy /terms /my-vijaya /sitemap.xml /robots.txt; do
  printf "%s %s\n" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "http://localhost:3000$p")" "$p"
done

echo "== Booking APIs =="
curl -s --max-time 20 http://localhost:3000/api/booking/VIJ-WG84SP | head -c 160; echo
echo "== Availability =="
curl -s -X POST -H "Content-Type: application/json" -d '{"date":"2026-12-01","slot":"EVENING","guests":200,"eventType":"WEDDING"}' --max-time 20 http://localhost:3000/api/availability/check | head -c 160; echo
echo "== CRM sync roundtrip =="
if [ -n "${CRM_SYNC_KEY:-}" ]; then
  curl -s -X POST -H "x-vicc-key: ${CRM_SYNC_KEY}" -H "Content-Type: application/json" -d '{"action":"BLOCK","spaceId":"periyar","date":"2027-03-01","slot":"MORNING"}' --max-time 20 http://localhost:3000/api/crm/sync; echo
  curl -s -X POST -H "x-vicc-key: ${CRM_SYNC_KEY}" -H "Content-Type: application/json" -d '{"action":"RELEASE","spaceId":"periyar","date":"2027-03-01","slot":"MORNING"}' --max-time 20 http://localhost:3000/api/crm/sync; echo
fi

echo "== Runtime errors in log this run =="
tail -200 dev.log | rg -v "prisma:query" | rg -i "error|exception|unhandled" | head -5
echo "(none above = clean)"

# Keep server alive a moment for log flush, then leave it to the sandbox lifecycle
sleep 2
kill $SERVER_PID 2>/dev/null
exit 0
