#!/usr/bin/env bash
# Run both PoseLab dev servers in one terminal.
# Usage: ./scripts/dev.sh
#
# Auto-detects your LAN IP + Tailscale hostname (where available) and feeds
# them to Next.js's ALLOWED_DEV_ORIGINS — required by Next 16 for the JS
# bundle to hydrate properly when you access from your phone.
#
# Override the auto-detected list:
#     ALLOWED_DEV_ORIGINS="my-host.example,1.2.3.4" ./scripts/dev.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

cleanup() {
  echo
  echo "shutting down…"
  pkill -P $$ 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ─── Auto-detect dev origins ────────────────────────────────────────────────
# Next 16 blocks /_next/webpack-hmr from any non-localhost host unless you
# allow-list it. Without this, phone visitors get a static HTML page with
# NO hydrated JavaScript — so upload button doesn't work, Settings doesn't
# open, etc. We detect best-effort:
#   - LAN IPv4 on en0 (macOS) or first non-loopback (Linux)
#   - Tailscale hostname + IPv4 when `tailscale` CLI is present
#
# User-supplied ALLOWED_DEV_ORIGINS env always wins.

detect_origins() {
  if [ -n "${ALLOWED_DEV_ORIGINS:-}" ]; then
    echo "$ALLOWED_DEV_ORIGINS"
    return
  fi

  local origins=""

  # LAN IP — macOS
  if command -v ipconfig >/dev/null 2>&1; then
    local lan
    lan=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
    [ -n "$lan" ] && origins="${origins}${origins:+,}${lan}"
  fi

  # LAN IP — Linux
  if [ -z "$origins" ] && command -v hostname >/dev/null 2>&1; then
    local lan
    lan=$(hostname -I 2>/dev/null | awk '{print $1}')
    [ -n "$lan" ] && origins="${origins}${origins:+,}${lan}"
  fi

  # Tailscale — IP and DNSName, parsed via python for nested JSON safety
  if command -v tailscale >/dev/null 2>&1; then
    local ts_ip ts_host
    ts_ip=$(tailscale ip -4 2>/dev/null | head -1 || true)
    ts_host=$(tailscale status --self --json 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    # Trailing dot is part of FQDN — strip it
    print((d.get('Self', {}).get('DNSName') or '').rstrip('.'))
except Exception:
    pass
" 2>/dev/null || true)
    [ -n "$ts_ip" ] && origins="${origins}${origins:+,}${ts_ip}"
    [ -n "$ts_host" ] && origins="${origins}${origins:+,}${ts_host}"
  fi

  echo "$origins"
}

# ─── Backend deps ───────────────────────────────────────────────────────────
if [ ! -d "api/.venv" ]; then
  echo "→ creating Python venv (one-time)"
  python3 -m venv api/.venv
fi

echo "→ ensuring API deps are installed"
api/.venv/bin/pip install --quiet --upgrade pip
api/.venv/bin/pip install --quiet -r api/requirements.txt

# ─── Frontend deps ──────────────────────────────────────────────────────────
if [ ! -d "web/node_modules" ]; then
  echo "→ installing web deps (one-time)"
  (cd web && pnpm install --silent)
fi

# ─── Resolve dev origins + announce ─────────────────────────────────────────
DEV_ORIGINS=$(detect_origins)
GIT_REV=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

cat <<EOF

─────────────────────────────────────────────────────
  PoseLab dev — running at commit $GIT_REV
─────────────────────────────────────────────────────
  Web        http://localhost:3030
  API docs   http://localhost:8000/docs
EOF

if [ -n "$DEV_ORIGINS" ]; then
  echo "  Allow-listed phone/LAN origins:"
  IFS=',' read -ra ORIGINS_ARR <<< "$DEV_ORIGINS"
  for origin in "${ORIGINS_ARR[@]}"; do
    echo "    http://${origin}:3030"
  done
else
  echo "  (no extra dev origins detected — only localhost works)"
fi
echo "─────────────────────────────────────────────────────"
echo

# Export GIT_REV so the API can surface it
export GIT_REV

# ─── Run both, mixed output, Ctrl-C kills both ──────────────────────────────
(
  cd api
  exec .venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
) &

(
  cd web
  ALLOWED_DEV_ORIGINS="$DEV_ORIGINS" \
  NEXT_PUBLIC_GIT_REV="$GIT_REV" \
  exec pnpm dev --port 3030 --hostname 0.0.0.0
) &

wait
