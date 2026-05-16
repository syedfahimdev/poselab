# Architecture

PoseLab is a two-process app: a FastAPI backend (`api/`) and a Next.js
frontend (`web/`). All AI calls flow through the backend; the frontend
sends user-provided keys as per-request headers (BYOK).

## High-level flow

```
                   ┌──────────────────────────────────────┐
                   │            Browser                   │
                   │  /enhance → upload → form → result   │
                   │  Settings → localStorage keys        │
                   └─────────────────┬────────────────────┘
                                     │ (multipart, JSON, X-* headers)
                                     ▼
              ┌──────────────────────────────────────────┐
              │           Next.js 16 (web/)               │
              │   /api-proxy/*  →  rewrite to FastAPI     │
              │   /enhance, /settings, /p/[slug], /login  │
              └─────────────────┬────────────────────────┘
                                ▼
              ┌──────────────────────────────────────────┐
              │            FastAPI (api/)                 │
              │                                           │
              │   /analyze    → ai.py → OpenRouter/etc.   │
              │   /generate   → openai_image.py | fal.py  │
              │   /upload     → storage.py (local fs)     │
              │   /share/*    → db.py (JSON files)        │
              │   /config     → providers.py (resolves    │
              │                  per-request keys)        │
              └──────────────────────────────────────────┘
```

## The prompt pipeline (the interesting part)

When a user uploads a photo, four layers of grounding stack into the
generated prompt — each pulls from different training-data distributions
that AI models recognize.

```
   knowledge.py         ───►   "this is a portrait — lineage:
   (named photographers,         Leibovitz, Avedon, Lindbergh, Karsh"
    principles, red flags)

   edit_techniques.py   ───►   "apply frequency separation,
   (Photoshop moves +            dodge-and-burn, orange-and-teal grade"
    photographers
    associated with each)

   aesthetic_movements  ───►   "commit to 'Blockbuster Polish' —
   (named looks + hex            #F4B789 highlights, #264D52 shadows"
    palettes + craftsmanship
    phrases)

   prompts.py           ───►   final paste-ready edit instruction:
   (composes all layers           "Edit this image: preserve face,
    + user's form choices         identity, age, ethnicity — apply
    + edit-style framing)         orange-and-teal grade meticulously..."
```

### Two-stage AI call for analysis

Stage 1 (cheap, ~1s): classify the photo into one of 9 scenarios.
Stage 2 (~2s): critique it using the matched scenario's KB principles, plus
generate 4-5 photo-specific options per category (pose / background /
lighting / style / focus). Options are dynamic — for a food shot the "pose"
category becomes "angle & framing" with options like "shoot from 45° above,
hide the chipped plate edge".

### Edit-style prompt-mode

The prompt-mode call generates an **edit instruction** (not a generation
prompt), opens with "Edit this image: preserve..." and lists every
identity-preservation constraint before the modifications. This is the
single biggest lever for face preservation when the prompt hits FLUX
Kontext / gpt-image-2.

## BYOK ("bring your own key")

PoseLab is designed so the operator doesn't need to configure any keys to
host it — users supply their own from the Settings panel. Mechanism:

1. **Frontend** stores `{ aiBaseUrl, aiKey, visionModel, textModel,
   openaiKey, falKey, ... }` in `localStorage` (`web/lib/settings.ts`).
2. **API client** (`web/lib/api.ts`) injects them as `X-AI-Base-URL`,
   `X-AI-Key`, `X-OpenAI-Key`, `X-Fal-Key` (and friends) on every request.
3. **Backend** has a `ProviderConfig` FastAPI dependency
   (`api/providers.py`) that reads each header and falls back to the
   matching env var if absent.
4. **Adapter modules** (`ai.py`, `openai_image.py`, `fal.py`) take
   `cfg: ProviderConfig` as a parameter — no globals — and forward the
   resolved key + base URL + model to the chosen provider.

Keys are never written to disk on the server. They live transiently in
request memory for the duration of one API call.

## Storage

Two storage planes:

- **Photos** (uploaded originals + AI-generated enhanced): served by
  FastAPI's `StaticFiles` mount at `/uploads/<id>.jpg` and
  `/enhanced/<id>.jpg`. The image_id is a 32-char uuid4 hex string; reads
  validate that exact shape to prevent path traversal.
- **Metadata** (analyses, public shares, daily rate-limit counters):
  JSON files in `api/data/db/`, atomic-replaced via `tmp + os.replace`.
  Wrap reads/writes in an `asyncio.Lock`. Swap for Supabase / Postgres by
  replacing `api/db.py` only — the public function signatures don't change.

## Why not Vercel-style serverless?

The image-generation flow polls fal.ai or OpenAI for 15-30 seconds. A
long-lived backend process is the right shape for this — also makes
local-file storage trivial. The `web/app/api-proxy/generate/route.ts` exists
explicitly to keep Next.js's dev rewrite from dropping the long upstream
connection.

## Where the layers live

| File | Owns |
|---|---|
| `api/knowledge.py` | Photographer lineage + principles + red flags + aesthetic targets per scenario |
| `api/edit_techniques.py` | 18 named Photoshop techniques with AI-translation strings + style affinities |
| `api/aesthetic_movements.py` | 5 named visual movements ("Blockbuster Polish", "Magazine Restraint") with hex palettes + craftsmanship phrases |
| `api/prompts.py` | Composes detect / critique / prompt-gen system prompts from the three knowledge sources |
| `api/ai.py` | OpenAI-compatible chat-completions client; vision + text |
| `api/openai_image.py` | OpenAI `/v1/images/edits` adapter (gpt-image-2 default) |
| `api/fal.py` | fal.ai queue API client (FLUX Pro Kontext default) |
| `api/providers.py` | The BYOK header-vs-env resolution layer |
| `web/lib/settings.ts` | localStorage settings + `buildProviderHeaders()` |
| `web/components/SettingsModal.tsx` | The Settings UI (provider preset, key, models, image-provider) |
| `web/lib/share.ts` | Web Share API helper for sharing photo + prompt to ChatGPT / Gemini |

## Failure modes & fallbacks

- **No API key configured at all** — `/analyze` returns mock-mode results
  with hard-coded sensible suggestions, so the UI flow is testable.
- **AI call fails (502)** — daily rate-limit credit is refunded
  (`ratelimit.refund_analyze`); user sees a friendly error pointing at
  Settings.
- **Supabase down** — `proxy.ts` (Next 16 middleware) is fail-open; the
  user becomes anonymous and the app keeps working.
- **fal.ai or OpenAI down** — `/generate` returns a 502 with the provider
  name in the message. User can switch provider in Settings.
