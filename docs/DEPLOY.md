# Deploy

PoseLab is a two-process app — Next.js frontend + FastAPI backend. Three
deploy patterns are commonly useful:

## 1. Local-only (single user, no public URL)

Already covered in the [README quickstart](../README.md). `git clone`,
install deps, run two terminals. Default; works on Linux, macOS, Windows.

## 2. Share over a private network (Tailscale, LAN, VPN)

This is the easiest way to test on your phone or share with friends without
public exposure.

```bash
# Backend bound to all interfaces (not just localhost)
cd api
.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend bound to all interfaces; tell Next which non-localhost origins
# to allow (required by Next 16's dev-origin security check)
cd web
ALLOWED_DEV_ORIGINS=my-laptop.tailnet-xxxxxx.ts.net,192.168.1.42 \
NEXT_PUBLIC_WEB_BASE_URL=http://my-laptop.tailnet-xxxxxx.ts.net:3030 \
pnpm dev --port 3030 --hostname 0.0.0.0
```

On your phone (must be on the same Tailscale tailnet OR same LAN):
`http://<your-hostname>:3030`.

## 3. Public deploy (Vercel + VPS)

The frontend is Vercel-friendly. The backend works well on any VPS that can
run a long-lived Python process (Fly.io, Railway, Hetzner, DigitalOcean,
self-hosted).

### Frontend on Vercel

```bash
cd web
vercel  # follow prompts
```

Set these env vars in Vercel:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `/api-proxy` (default — keeps everything same-origin) |
| `NEXT_PUBLIC_WEB_BASE_URL` | `https://your-app.vercel.app` |
| `API_PROXY_TARGET` | URL of your FastAPI backend (e.g. `https://api.yourdomain.com`) |

### Backend on a VPS

```bash
git clone https://github.com/<you>/poselab.git
cd poselab/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set production env
cat > .env <<'EOF'
PYTHON_ENV=production
WEB_BASE_URL=https://your-app.vercel.app
API_BASE_URL=https://your-app.vercel.app/api-proxy
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
# Optional server-side defaults — users can still BYOK via Settings:
# OPENROUTER_API_KEY=
# OPENAI_API_KEY=
# FAL_KEY=
EOF

# Run behind a reverse proxy (Caddy / Nginx) for TLS
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

Sample Caddyfile:

```caddy
api.yourdomain.com {
    reverse_proxy localhost:8000
}
```

### Systemd unit (optional)

```ini
# /etc/systemd/system/poselab-api.service
[Unit]
Description=PoseLab API
After=network.target

[Service]
Type=simple
User=poselab
WorkingDirectory=/opt/poselab/api
EnvironmentFile=/opt/poselab/api/.env
ExecStart=/opt/poselab/api/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Production checklist

Before exposing PoseLab on a public URL:

- [ ] `PYTHON_ENV=production` is set on the backend (disables all dev affordances)
- [ ] `ALLOW_DEV_AUTH` is **NOT** set (default-deny)
- [ ] `CORS_ALLOWED_ORIGINS` lists your real frontend origin — never `*`
- [ ] TLS is in front of the API (Caddy, Cloudflare, Vercel proxy, ...)
- [ ] If using Supabase user accounts: `SUPABASE_JWT_SECRET` is set
- [ ] If self-hosting: a reverse proxy is enforcing a max upload size (~15 MB)
- [ ] `api/data/` is on persistent disk (or you've swapped `api/db.py` for
      Supabase / Postgres)
- [ ] Backups: `api/data/db/*.json` and `api/data/uploads/` directories

## Provider keys: BYOK vs server-side

Two ways to supply provider API keys:

1. **BYOK (default)** — leave the server's env empty. Users add their own
   keys via the Settings panel. Best for personal projects or small groups
   where each user supplies their own credentials.
2. **Server-side defaults** — set `OPENROUTER_API_KEY`, `OPENAI_API_KEY`,
   `FAL_KEY` etc. in the backend's `.env`. Users with no Settings keys
   automatically inherit these. Best when you're paying for AI on your
   users' behalf — but watch your bill.

Both modes coexist. Per-request headers always take precedence over env.
