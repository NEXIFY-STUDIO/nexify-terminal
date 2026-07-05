#!/usr/bin/env bash
# Sync selected keys from .env.local to Vercel Production.
# Usage: bash scripts/sync-vercel-env.sh
# Requires: vercel CLI logged in, .env.local present in project root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

keys=(
  NEXT_PUBLIC_PASSCODE
  NEXTAUTH_SECRET
  HACK_API_URL
  AI_PROXY_URL
  HACK_API_TOKEN
  SHELL_TOKEN
  AI_PROVIDER
  MISTRAL_API_KEY_1
  MISTRAL_API_KEY_2
  MISTRAL_MODEL
)

cd "$ROOT"

for key in "${keys[@]}"; do
  val=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)
  if [[ -z "$val" ]]; then
    echo "SKIP $key (not in .env.local)"
    continue
  fi
  sensitive=(--sensitive)
  if [[ "$key" == "AI_PROVIDER" || "$key" == "MISTRAL_MODEL" ]]; then
    sensitive=()
  fi
  printf '%s' "$val" | vercel env add "$key" production --force --yes "${sensitive[@]}"
  echo "OK $key"
done

printf '%s' "true" | vercel env add DISABLE_TAILSCALE_LOCKDOWN production --force --yes
echo "OK DISABLE_TAILSCALE_LOCKDOWN"

vercel env ls production