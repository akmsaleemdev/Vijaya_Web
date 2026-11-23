#!/bin/bash
# P0 RECOVERY: Start Next.js dev server on port 3000 (smallest fix).
# No db:push, no install, no destructive ops. Just `bun run dev` detached.
set -u

cd /home/z/my-project

# 1. Kill any stale dev server recorded in .zscripts/dev.pid
if [ -f .zscripts/dev.pid ]; then
  OLD=$(cat .zscripts/dev.pid 2>/dev/null || echo "")
  if [ -n "$OLD" ] && kill -0 "$OLD" 2>/dev/null; then
    echo "[stop] killing stale dev PID $OLD"
    kill "$OLD" 2>/dev/null || true
    sleep 1
  else
    echo "[stop] stale PID $OLD not alive, skipping"
  fi
fi

# 2. Also kill anything bound to port 3000 (defensive)
P3000=$( (ss -tlnp 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1) || echo "" )
if [ -n "$P3000" ]; then
  echo "[stop] killing process holding port 3000: $P3000"
  kill "$P3000" 2>/dev/null || true
  sleep 1
fi

# 3. Start dev server fully detached, in its own session, no controlling tty.
#    Use a pipeline that does NOT rely on tee so the redirect is clean.
echo "[start] launching bun run dev"
setsid nohup bash -c 'exec bun run dev' > dev.log 2>&1 < /dev/null &
DEV_PID=$!
disown "$DEV_PID" 2>/dev/null || true
echo "$DEV_PID" > .zscripts/dev.pid
echo "[start] dev PID recorded: $DEV_PID"

# 4. Wait for port 3000 to respond with HTTP 200/3xx
echo "[wait] polling http://localhost:3000 ..."
OK=0
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 1 --max-time 3 http://localhost:3000/ 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ] || [ "$CODE" = "307" ] || [ "$CODE" = "308" ]; then
    echo "[wait] port 3000 responded HTTP $CODE after ${i}s"
    OK=1
    break
  fi
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "[wait] dev PID $DEV_PID died before port opened (after ${i}s)"
    break
  fi
  sleep 1
done

if [ "$OK" != "1" ]; then
  echo "[FAIL] dev server did not become ready"
  echo "--- dev.log (last 40 lines) ---"
  tail -40 dev.log 2>&1
  exit 1
fi

# 5. Confirm process still alive
if kill -0 "$DEV_PID" 2>/dev/null; then
  echo "[alive] dev PID $DEV_PID is running"
else
  echo "[FAIL] dev PID $DEV_PID is NOT running"
  exit 1
fi

# 6. Confirm port 3000 is bound
if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
  echo "[port] 3000 LISTEN"
else
  echo "[WARN] port 3000 not found in ss output (but HTTP responded)"
fi

# 7. Verify homepage HTML contains VIJAYA branding
curl -s -o /tmp/p0_home.html -w "HTTP:%{http_code} bytes:%{size_download}\n" http://localhost:3000/
echo "[home] VIJAYA occurrences: $(grep -c 'VIJAYA' /tmp/p0_home.html)"
echo "[home] first 400 chars:"
head -c 400 /tmp/p0_home.html
echo ""
echo "[DONE] dev server is up and serving the VIJAYA homepage"
