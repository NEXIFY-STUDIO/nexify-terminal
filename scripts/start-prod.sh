#!/usr/bin/env bash
set -euo pipefail

# Nastavíme port, na ktorom bude počúvať Next.js
export WEB_PORT="${PORT:-8080}"
export PORT="3021" # Hacking API
export AI_PROXY_PORT="8788" # AI Proxy

echo "[start-prod] starting hacking API on :$PORT"
node services/hacking-api/server.js &

echo "[start-prod] starting AI proxy on :$AI_PROXY_PORT"
node services/ai-proxy/ai-proxy.mjs &

echo "[start-prod] starting Next UI (Standalone) on :$WEB_PORT"
export HOSTNAME="0.0.0.0"
export PORT="$WEB_PORT"
exec node server.js
