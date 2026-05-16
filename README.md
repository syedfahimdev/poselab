# PoseLab

> A photo coach in your pocket. Upload a photo, get a paste-ready AI prompt
> that fixes pose, background, lighting, and style — grounded in named
> photographers (Leibovitz, Adams, Avedon) and Photoshop techniques
> (frequency separation, dodge-and-burn, orange-and-teal grading). Open the
> prompt in ChatGPT, Gemini, or generate the enhanced image in-app.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **AI photo coach** — analyzes any uploaded photo against the principles of
  named master photographers (different lineage per scenario: portrait /
  food / sunset / architecture / pets / etc.)
- **Photoshop-grade prompts** — output references real techniques by name
  (frequency separation, dodge-and-burn, orange-and-teal cinematic grade,
  channel-mixer B&W, Orton effect, ...) — vocabulary AI image models
  recognize from editorial training captions.
- **Identity preservation** — prompts are written as edit instructions
  ("Edit this image: preserve face, identity, age, ethnicity, body, clothes —
  DO NOT alter facial features") so the subject's face actually stays put.
- **BYOK ("bring your own key")** — plug in any OpenAI-compatible provider
  (OpenRouter, OpenAI, Groq, Together, self-hosted LiteLLM) from the
  Settings panel. Keys live in your browser's localStorage — never on
  PoseLab's servers.
- **Web Share API** — on phone, share the photo + prompt to ChatGPT, Gemini,
  Messages, or any installed app with one tap.
- **8 offline cheat sheets** — hand-curated camera settings per scenario ×
  device (iPhone, Pixel, Galaxy, Android, DSLR). Works without internet.
- **Public share URLs** — every generated prompt gets a shareable
  `/p/<slug>` page with before/after.

## Quick start

```bash
git clone https://github.com/<you>/poselab && cd poselab

# Backend (Python 3.11+)
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (Node 20+, pnpm)
cd ../web
pnpm install
pnpm dev --port 3030
```

Open <http://localhost:3030>, click the ⚙ icon top-right, paste your API key
(get a free one at [openrouter.ai/keys](https://openrouter.ai/keys)), and
start uploading photos. **No server-side `.env` configuration is required** —
PoseLab is BYOK by default.

## Choose your AI provider

PoseLab works with **any OpenAI-compatible chat-completions endpoint** plus
OpenAI's image-editing API or fal.ai's FLUX Pro Kontext.

| Provider | Best for | Get a key |
|---|---|---|
| **OpenRouter** (recommended) | One key, 50+ models including Gemini, Claude, GPT | <https://openrouter.ai/keys> |
| **OpenAI direct** | GPT-4o, GPT-image-2 (image gen with strong identity preservation) | <https://platform.openai.com/api-keys> |
| **Groq** | Free vision via Llama, very fast | <https://console.groq.com/keys> |
| **Together AI** | Llama Vision, Mixtral, Flux | <https://api.together.xyz> |
| **LiteLLM** | Self-hosted proxy to any of the above | <https://github.com/BerriAI/litellm> |
| **fal.ai** | Alternative image-gen (FLUX Pro Kontext) | <https://fal.ai/dashboard/keys> |

All keys are entered in the Settings panel and sent as per-request headers
to PoseLab's backend, which forwards them to the provider. PoseLab never
persists keys server-side. See [docs/SECURITY.md](docs/SECURITY.md).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind 4 + TypeScript |
| Backend | FastAPI 0.115 on Python 3.11+ |
| AI (text + vision) | Any OpenAI-compatible API (OpenRouter is the default) |
| AI (image gen) | OpenAI gpt-image-2 (default) or fal.ai FLUX Pro Kontext |
| Storage | Local filesystem + JSON files (Supabase-swappable) |
| Auth (optional) | Supabase (Google OAuth + magic link); anonymous flow by default |

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how prompts get built
  (knowledge base → edit techniques → aesthetic movements → output)
- [docs/DEPLOY.md](docs/DEPLOY.md) — deploying to your own VPS / Vercel
- [docs/SECURITY.md](docs/SECURITY.md) — BYOK design, threat model, what to
  harden before exposing publicly
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — how to contribute
- [docs/PRD.md](docs/PRD.md) — original product vision

## License

[MIT](LICENSE) — fork, modify, and ship your own version freely.
