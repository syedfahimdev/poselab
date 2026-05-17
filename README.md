# PoseLab

> A photo coach in your pocket. Upload a photo → get a paste-ready AI edit
> prompt grounded in named photographers (Leibovitz, Adams, Avedon) and
> Photoshop techniques (frequency separation, dodge-and-burn, orange-and-teal
> grading). Then either share it to ChatGPT / Gemini in one tap or generate
> the enhanced image in-app via OpenAI gpt-image-2, Runware, or fal.ai.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-yes-brightgreen.svg)](https://github.com/syedfahimdev/poselab)

---

## ⚡ Run it (90 seconds)

```bash
git clone https://github.com/syedfahimdev/poselab && cd poselab
make install        # creates venv + installs deps for both api/ and web/
make dev            # starts FastAPI on :8000 and Next.js on :3030
```

Open <http://localhost:3030>, click the ⚙ icon top-right, paste any AI key
you have. Done — no `.env` editing required. PoseLab is **BYOK**
("bring your own key"): everything runs through keys you enter in the
browser, stored only in *your* localStorage.

Get a free OpenRouter key for the text+vision side at <https://openrouter.ai/keys>
(one key covers Gemini, Claude, GPT, and dozens more models).

> Don't have `make`? Two terminals — `cd api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn main:app --reload` and `cd web && pnpm install && pnpm dev --port 3030`.

---

## Features

- **AI photo coach** — analyzes any uploaded photo through the lens of named
  master photographers (different lineage per scenario: portrait / food /
  sunset / architecture / pets / etc.)
- **Photoshop-grade prompts** — output references real techniques by name:
  frequency separation (Pratik Naik), dodge-and-burn (Glyn Dewis), orange-
  and-teal cinematic grade (Stefan Sonnenfeld), channel-mixer B&W (Ansel
  Adams), Orton effect — vocabulary AI image models recognize.
- **Identity preservation** — prompts are written as **edit instructions**
  (`"Edit this image: preserve face, identity, age, ethnicity, body, clothes
   — DO NOT alter facial features"`) so the subject's face actually stays put.
- **Dynamic options per category** — the AI generates 4-5 photo-specific
  options for pose / background / lighting / style / focus based on your
  *actual* uploaded photo, not generic preset chips.
- **3 image-gen providers, auto-resolved** — Runware (one key, many models
  including gpt-image-2), OpenAI direct, or fal.ai's FLUX Pro Kontext. Falls
  through in order; user picks via dropdown in Settings.
- **BYOK** — any OpenAI-compatible text/vision provider (OpenRouter, OpenAI,
  Groq, Together, self-hosted LiteLLM). Keys never touch the server's disk.
- **Web Share API** — on phone, share the photo + prompt to ChatGPT, Gemini,
  Messages, or any installed app with one tap. No more broken "Open in
  ChatGPT" URL params.
- **8 offline cheat sheets** — hand-curated camera settings per scenario ×
  device (iPhone, Pixel, Galaxy, Android, DSLR). Works without internet.
- **Public share URLs** — every prompt gets a shareable `/p/<slug>` page
  with before/after, EXIF stripped, faceblur option.

---

## Pick your AI provider

PoseLab works with **any OpenAI-compatible chat-completions endpoint** for
text+vision, and three different image-gen backends. Mix and match — say
OpenRouter for vision + Runware for image gen.

### Text + Vision (any one of these — set in Settings)

| Provider | Best for | Get a key |
|---|---|---|
| **OpenRouter** *(recommended)* | One key, 50+ models incl. Gemini, Claude, GPT-4o | <https://openrouter.ai/keys> |
| **OpenAI direct** | GPT-4o, GPT-5 — strictest billing path | <https://platform.openai.com/api-keys> |
| **Groq** | Free vision via Llama 3.2 90B; very fast | <https://console.groq.com/keys> |
| **Together AI** | Llama Vision, Mixtral, Flux | <https://api.together.xyz> |
| **LiteLLM** | Self-hosted proxy to all of the above | <https://github.com/BerriAI/litellm> |
| **Anything OpenAI-compatible** | Custom base URL + key from the Settings panel | – |

### Image generation (auto-picks the first configured; user can override)

| Provider | Strength | Get a key |
|---|---|---|
| **Runware** *(recommended)* | One key, many models — gpt-image-2, Flux Pro, Grok Imagine, more | <https://runware.ai> |
| **OpenAI direct** | gpt-image-2 with strongest identity preservation | <https://platform.openai.com/api-keys> |
| **fal.ai** | FLUX Pro Kontext — cheap, fast, image-to-image | <https://fal.ai/dashboard/keys> |

All keys are entered in the Settings panel and sent as per-request headers
to PoseLab's backend, which forwards them to the chosen provider. PoseLab
never persists keys server-side. See [docs/SECURITY.md](docs/SECURITY.md).

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind 4 + TypeScript |
| Backend | FastAPI 0.115 on Python 3.11+ |
| AI (text + vision) | Any OpenAI-compatible API |
| AI (image gen) | Runware / OpenAI gpt-image-2 / fal.ai FLUX Pro Kontext |
| Storage | Local filesystem + JSON (Supabase-swappable) |
| Auth (optional) | Supabase (Google OAuth + magic link); anonymous flow by default |

---

## 🛠 Extending PoseLab

PoseLab is built to be hackable. Concrete walkthroughs in
[docs/EXTENDING.md](docs/EXTENDING.md):

- **Add a new image-gen provider** (e.g. Stability, Replicate, Midjourney)
- **Add a new text+vision provider preset** to the Settings dropdown
- **Add a new photo scenario** to the knowledge base (e.g. "macro",
  "product photo")
- **Add a new Photoshop edit technique** that gets auto-selected based on
  user choices
- **Add a new aesthetic movement** with hex palette + craftsmanship phrases

The architecture deliberately separates **knowledge** (what masters know)
from **techniques** (how to apply it) from **aesthetic movements** (named
looks). New entries in any of these modules light up automatically in the
prompt pipeline.

---

## Docs

| | |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The prompt pipeline + BYOK plumbing + where each layer lives |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Local / Tailscale / Vercel + VPS deploy patterns, prod checklist |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, what's enforced, what to harden before public exposure |
| [docs/EXTENDING.md](docs/EXTENDING.md) | Step-by-step guides for adding providers, scenarios, techniques |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute, code style, commit conventions |
| [docs/PRD.md](docs/PRD.md) | Original product vision (historical) |

---

## License

[MIT](LICENSE) — fork it, modify it, ship your own version. If you make
something cool, let me know on [LinkedIn](https://www.linkedin.com).
