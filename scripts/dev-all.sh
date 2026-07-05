#!/usr/bin/env bash
# Run the Nexify Phase 1 dev stack: Next UI + hacking API + AI proxy.
# No extra npm deps required — uses background processes and traps to clean up.
#
# Ports (override with env):
#   Next UI    : 3322
#   hacking API: PORT=3010 (set below; legacy default is 3001)
#   AI proxy   : AI_PROXY_PORT=8787
#
# WARNING: the copied hacking API also listens on 3010. If the OLD Nexify
# service is already bound to 3010, stop it first or override PORT here.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="$ROOT_DIR/node_modules/.bin:${PATH:-/usr/bin:/bin}"

# Load .env.local / .env if present (best-effort, ignore comments).
for envfile in .env.local .env; do
  if [ -f "$envfile" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$envfile"
    set +a
  fi
done

export PORT="${PORT:-3021}"
export AI_PROXY_PORT="${AI_PROXY_PORT:-8788}"
export WEB_PORT="${WEB_PORT:-3322}"

echo "[dev-all] cleaning up any existing processes on ports $PORT, $AI_PROXY_PORT, $WEB_PORT..."
for port in "$PORT" "$AI_PROXY_PORT" "$WEB_PORT"; do
  pids_to_kill=$(lsof -t -i :"$port" 2>/dev/null || true)
  if [ -n "$pids_to_kill" ]; then
    echo "[dev-all] killing existing processes on port $port: $pids_to_kill"
    echo "$pids_to_kill" | xargs kill -9 2>/dev/null || true
  fi
done

pids=()
cleanup() {
  echo "[dev-all] shutting down..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "[dev-all] starting hacking API on :$PORT"
node services/hacking-api/server.js &
pids+=("$!")

echo "[dev-all] starting AI proxy on :$AI_PROXY_PORT"
node services/ai-proxy/ai-proxy.mjs &
pids+=("$!")

echo "[dev-all] starting Next UI on :$WEB_PORT (0.0.0.0)"
next dev -H 0.0.0.0 -p "${WEB_PORT:-${NEXT_PORT:-3322}}" &
pids+=("$!")

echo "[dev-all] all services started (pids: ${pids[*]}), watching..."
while true; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "[dev-all] process $pid died — exiting for launchd relaunch"
      exit 1
    fi
  done
  sleep 10
done
