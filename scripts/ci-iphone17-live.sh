#!/usr/bin/env bash
# CI / local wrapper: start stack → healthcheck → pnpm test:iphone17-live → teardown.
# Usage: pnpm test:iphone17-live:ci
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="$ROOT_DIR/node_modules/.bin:${PATH:-/usr/bin:/bin}"

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
elif [ -f .env.ci ]; then
  cp .env.ci .env.local
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

export PORT="${PORT:-3021}"
export AI_PROXY_PORT="${AI_PROXY_PORT:-8788}"
export AI_PROXY_HOST="${AI_PROXY_HOST:-0.0.0.0}"
export WEB_PORT="${WEB_PORT:-3322}"

pids=()
cleanup() {
  echo "[ci-iphone17-live] shutting down pids: ${pids[*]:-}"
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "[ci-iphone17-live] starting hacking API on :$PORT"
node services/hacking-api/server.js &
pids+=("$!")

echo "[ci-iphone17-live] starting AI proxy on :$AI_PROXY_PORT"
node services/ai-proxy/ai-proxy.mjs &
pids+=("$!")

echo "[ci-iphone17-live] starting Next UI on :$WEB_PORT"
pnpm exec next dev -H 0.0.0.0 -p "$WEB_PORT" &
pids+=("$!")

echo "[ci-iphone17-live] waiting for health (max 90s)..."
deadline=$((SECONDS + 90))
ok_web=0
ok_shell=0
while (( SECONDS < deadline )); do
  if curl -sf "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1; then
    ok_web=1
  fi
  if curl -sf -X POST "http://127.0.0.1:${WEB_PORT}/api/shell?path=sessions" \
    -H 'Content-Type: application/json' \
    -d "{\"cwd\":\"${SHELL_CWD_ALLOWLIST%%,*}\",\"cols\":80,\"rows\":24}" >/dev/null 2>&1; then
    ok_shell=1
  elif curl -sf -X POST "http://127.0.0.1:${PORT}/api/shell/sessions" \
    -H "Content-Type: application/json" \
    -H "X-Shell-Token: ${SHELL_TOKEN:-}" \
    -d "{\"cwd\":\"${SHELL_CWD_ALLOWLIST%%,*}\",\"cols\":80,\"rows\":24}" >/dev/null 2>&1; then
    ok_shell=1
  fi
  if [[ "$ok_web" -eq 1 && "$ok_shell" -eq 1 ]]; then
    echo "[ci-iphone17-live] healthy (web + shell)"
    break
  fi
  sleep 2
done

if [[ "$ok_web" -ne 1 || "$ok_shell" -ne 1 ]]; then
  echo "[ci-iphone17-live] healthcheck FAILED (web=$ok_web shell=$ok_shell)" >&2
  exit 1
fi

echo "[ci-iphone17-live] running Playwright live suite..."
pnpm test:iphone17-live
echo "[ci-iphone17-live] done"
