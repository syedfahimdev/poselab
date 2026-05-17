#!/usr/bin/env bash
# Run both PoseLab dev servers in one terminal.
# Usage: ./scripts/dev.sh
#
# Sets up the Python venv + node_modules on first run; otherwise just
# starts uvicorn (port 8000) and Next.js (port 3030) in parallel.

set -euo pipefail

# Resolve repo root regardless of where this is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Kill both child processes when this script exits
cleanup() {
  echo
  echo "shutting down…"
  pkill -P $$ 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ─── Backend ────────────────────────────────────────────────────────────────
if [ ! -d "api/.venv" ]; then
  echo "→ creating Python venv (one-time)"
  python3 -m venv api/.venv
fi

# Activate venv + ensure deps are current (pip install is a no-op if so)
echo "→ ensuring API deps are installed"
api/.venv/bin/pip install --quiet --upgrade pip
api/.venv/bin/pip install --quiet -r api/requirements.txt

# ─── Frontend ───────────────────────────────────────────────────────────────
if [ ! -d "web/node_modules" ]; then
  echo "→ installing web deps (one-time)"
  (cd web && pnpm install --silent)
fi

echo
echo "─────────────────────────────────────────────────────"
echo "  PoseLab dev — http://localhost:3030"
echo "  API docs    — http://localhost:8000/docs"
echo "─────────────────────────────────────────────────────"
echo

# ─── Run both, mixed output, Ctrl-C kills both ──────────────────────────────
(
  cd api
  exec .venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
) &

(
  cd web
  exec pnpm dev --port 3030 --hostname 0.0.0.0
) &

wait
