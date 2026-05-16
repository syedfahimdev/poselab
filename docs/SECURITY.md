# Security

## Threat model & design choices

PoseLab is designed to be safely self-hostable by an individual. The primary
threat is **API-key exfiltration** (because keys connect to paid third-party
services). Secondary threats are spam abuse and uploaded-content leakage.

## Where API keys live

| Layer | Key storage |
|---|---|
| Frontend | `localStorage` on the user's device only |
| In transit | HTTPS-only when deployed publicly; sent as `X-AI-Key`, `X-OpenAI-Key`, `X-Fal-Key` headers |
| Backend | Held in request memory for the duration of one call. **Never persisted, never logged in plaintext.** |
| Server env (optional) | If the operator chose to set `.env` defaults, they live there. Standard env-var hygiene applies. |

The server's `safe_repr()` helper redacts keys in logs (`api/providers.py`).

## What's enforced

| Threat | Mitigation |
|---|---|
| Path traversal on `image_id` | `^[a-f0-9]{32}$` regex validation in both `main.py` and `storage.py` (defense in depth) |
| Path traversal on share `slug` | `^[a-z0-9]{8}$` regex validation |
| Symlink escape from uploads dir | `Path.resolve().startswith(UPLOADS_DIR.resolve())` check in `storage.read_upload` |
| `*` CORS origin with credentials | Hard-rejected at startup (see `api/main.py:CORS check`) |
| Anonymous-share takedown abuse | Anon shares can only be deleted by the original creator's `X-Anon-Id` cookie/header |
| Dev-auth bypass in prod | Requires explicit `ALLOW_DEV_AUTH=1` AND no `SUPABASE_JWT_SECRET`. Refuses any other bearer shape. |
| AI failure consumes rate-limit credit | Counter is **refunded** on 502 (see `ratelimit.refund_analyze`) |
| EXIF leakage on shared photos | EXIF is stripped on every upload via Pillow (`api/storage.py:_normalize_image`) |
| Image-size DOS | Server caps uploads at 12 MB + downscales to 2048px max dimension |

## What's NOT enforced (yet)

These are open issues. Hardening here would be welcomed contributions.

- **Anonymous rate-limit bypass**: rotating the `X-Anon-Id` cookie/header
  resets your daily quota. Acknowledged in code. Real defense requires
  authentication or device-fingerprinting, neither of which fits the BYOK
  ethos. Self-hosters who care should put OAuth in front.
- **No NSFW filter on uploads**: before exposing publicly, consider adding
  a server-side classifier or fronting with Cloudflare's image abuse APIs.
  Especially important if you set `OPENAI_API_KEY` / `FAL_KEY` server-side —
  abuse hits your bill.
- **Public shares are public by default**: a published `/p/<slug>` is
  unlisted but indexable if anyone links to it. The slug is 8 random
  base36 chars (~2.8e12 possibilities), so unguessable in practice.
  Owners can delete shares but they're not actively revoked from search
  engines if scraped.
- **No CSRF protection on `/auth/sign-out`**: POST-only, but no token. Low
  impact (worst case: someone signs you out). Add a token when adding any
  state-changing route that should be CSRF-protected.

## Hardening before going public

If you're running PoseLab on a public URL and either (a) paying for AI on
users' behalf or (b) accepting uploads from strangers:

1. **Set `PYTHON_ENV=production`** — disables dev affordances.
2. **Do not set `ALLOW_DEV_AUTH`** — leave unset.
3. **Make `CORS_ALLOWED_ORIGINS` an explicit list** — never `*`.
4. **Put TLS in front** (Caddy / Cloudflare / Vercel).
5. **Add an NSFW filter on `/upload`** (Cloudflare image abuse or a small
   classifier).
6. **Cap requests at the proxy layer** — Caddy/Nginx rate-limiting on
   `/api-proxy/upload` and `/api-proxy/analyze`.
7. **Rotate Supabase JWT secret** if you've ever shared the `.env`
   file with anyone.
8. **Audit `api/data/`** for any test photos before going public — that
   directory holds user uploads.

## Reporting vulnerabilities

If you find a security issue, please open a private GitHub issue or email
the maintainer rather than filing it publicly. See [CONTRIBUTING.md](CONTRIBUTING.md).
