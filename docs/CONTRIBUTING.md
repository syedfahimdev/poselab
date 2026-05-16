# Contributing

Thanks for considering a contribution! PoseLab is intentionally small and
opinionated — the goal is "a real photo coach a hobbyist can run alone."

## Setting up

```bash
git clone https://github.com/<you>/poselab && cd poselab

cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd ../web
pnpm install
```

Run both servers and open <http://localhost:3030>. Drop your AI key into
Settings — no `.env` editing required.

## Project layout

```
poselab/
├── api/                    Python / FastAPI backend
│   ├── main.py             routes
│   ├── providers.py        BYOK header → ProviderConfig
│   ├── ai.py               OpenAI-compatible text + vision
│   ├── openai_image.py     gpt-image-2 (images.edit)
│   ├── fal.py              FLUX Pro Kontext (fal.ai queue API)
│   ├── knowledge.py        photographer lineage per scenario
│   ├── edit_techniques.py  Photoshop techniques catalog
│   ├── aesthetic_movements.py  named visual looks + hex palettes
│   ├── prompts.py          assembles the system prompts
│   ├── db.py               local JSON persistence (atomic writes)
│   ├── storage.py          local filesystem for uploads + enhanced
│   ├── ratelimit.py        per-day caps
│   └── auth.py             Supabase JWT + anon flow
├── web/                    Next.js 16 + React 19 frontend
│   ├── app/                routes
│   ├── components/         UI
│   ├── lib/                shared logic (settings, api client, share API)
│   └── public/             static assets
├── supabase/migrations/    optional Postgres schema if running Supabase
└── docs/                   architecture / deploy / security
```

## Where to start

Quick wins (good first contributions):

- **New `EditTechnique` entries** in `api/edit_techniques.py` — research a
  Photoshop master, add their named technique with `ai_translation` and
  `style_affinities`. Pattern is the existing entries.
- **New `Scenario` knowledge** in `api/knowledge.py` — e.g. "interior
  design", "product photo", "macro". Add 3-5 photographers, 4-5
  principles, red flags, aesthetic targets.
- **New aesthetic movements** in `api/aesthetic_movements.py` — a named
  visual style with a hex palette and craftsmanship phrases.
- **More provider presets** in `web/lib/settings.ts > AI_PRESETS`.

Bigger projects:

- **Native iOS / Android app** via React Native or Capacitor — the API is
  ready, just wrap it.
- **Supabase swap** for `api/db.py` and `api/storage.py` — preserve the
  function signatures.
- **Coach Mode** (the live-camera variant in `docs/PRD.md`) — needs
  `getUserMedia` and HTTPS-only image capture.
- **Sharing the photo via WebRTC** so two people can co-edit a prompt in
  realtime.

## Code style

- Backend: type hints everywhere; `from __future__ import annotations` at
  the top of new files for forward-ref-free Python 3.11+ idioms.
- Frontend: TypeScript strict mode; prefer composition over abstraction;
  no React Context for state that doesn't need it (most things don't).
- Tests: minimal so far — `pytest` for backend, no frontend test harness
  yet. Adding `vitest` + `playwright` would be welcome.

## Commit / PR conventions

- One feature or one bugfix per PR.
- Conventional-commit style is appreciated but not required:
  `feat(api): support Groq as preset provider`.
- Include a short rationale in the PR description: what changed, why, how
  you tested.
- Before pushing, run a final secret scan:
  ```bash
  grep -rE "sk-[a-zA-Z0-9_-]{20,}|sk-or-v1|sk-ant-|AIza[a-zA-Z0-9_-]{30,}" \
    --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.git \
    --exclude-dir=__pycache__ --exclude-dir=.next --exclude-dir=data \
    .
  ```

## Reporting bugs

Open a GitHub issue with:

1. What you did (browser, OS, backend env, the photo or scenario)
2. What you expected
3. What actually happened (with the relevant logs from
   `uvicorn` stdout and the browser console)

For security issues, please email the maintainer rather than filing publicly.

## Code of conduct

Be kind. Be specific. Assume good intent. Disagree on the substance.
