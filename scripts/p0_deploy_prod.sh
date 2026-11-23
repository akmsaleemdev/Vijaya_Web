#!/usr/bin/env bash
# P0 DEPLOY: switch port 3000 from the Next.js dev server to the standalone
# production server (`.next/standalone/server.js`). Caddy on port 81 keeps
# reverse-proxying to port 3000, so the user-facing URL is unchanged.
#
# Prereq: `bun run build` has produced `.next/standalone/server.js`.
set -euo pipefail
cd /home/z/my-project

PORT=3000
LOG=server.log

# 1. Stop the dev server recorded in .zscripts/dev.pid
if [ -f .zscripts/dev.pid ]; then
  OLD=$(cat .zscripts/dev.pid 2>/dev/null || echo "")
  if [ -n "$OLD" ] && kill -0 "$OLD" 2>/dev/null; then
    echo "[stop] killing dev PID $OLD"
    kill "$OLD" 2>/dev/null || true
    sleep 2
  fi
fi

# 2. Also kill anything still bound to port 3000 (defensive)
P3000=$( (ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1) || echo "" )
if [ -n "$P3000" ]; then
  echo "[stop] killing process holding port $PORT: $P3000"
  kill "$P3000" 2>/dev/null || true
  sleep 2
fi

# 3. Start the production standalone server, fully detached (survives this turn).
#    Bun auto-loads .env, so DATABASE_URL reaches the server.
echo "[start] launching production standalone server on port $PORT"
setsid nohup bash -c 'exec env NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 bun .next/standalone/server.js' > "$LOG" 2>&1 < /dev/null &
DEV_PID=$!
disown "$DEV_PID" 2>/dev/null || true
echo "$DEV_PID" > .zscripts/dev.pid
echo "[start] production PID recorded: $DEV_PID"

# 4. Wait for port 3000 to respond with HTTP 200/3xx
echo "[wait] polling http://localhost:$PORT ..."
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:$PORT/" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ] || [ "${CODE:0:1}" = "3" ]; then
    echo "[ready] port $PORT responded HTTP $CODE after ${i}s"
    exit 0
  fi
  sleep 1
done

echo "[FAIL] port $PORT did not come up in 30s — last log lines:"
tail -20 "$LOG"
exit 1
