# PoseLab — Product Requirements Document

**Version**: 1.0 (MVP)
**Status**: Initial vision — most of v1 is shipped; see [ARCHITECTURE.md](ARCHITECTURE.md) for current state

> This is the original product vision document. Kept here for historical
> context — the actual implementation has evolved (BYOK provider config,
> Web Share API, identity-preserving prompts, etc.). For the current state
> see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Vision

Most people own a camera that's better than what professionals used 10 years ago, but their photos look amateur because **nobody taught them how to use it**.

PoseLab is a mobile-first web app that acts as a real-time photo director — it sees what the user sees, tells them where to stand, what settings to use, and how to make any phone or DSLR produce great images. It also turns existing photos into ready-to-paste prompts for AI image editors like Nano Banana, GPT Image, and Midjourney.

**One-line pitch**: "A photo coach in your pocket, plus an AI prompt generator that makes any photo look professional."

---

## 2. Problem

Three pain points, one app:

1. **Phone owners** don't know which mode/settings to use for their scene. They shoot everything in Auto and wonder why it looks flat.
2. **DSLR/mirrorless beginners** (Canon Rebel T6, Sony A6000, Nikon Z50) know their camera has Manual mode but can't decide settings fast enough before the moment passes.
3. **AI-image tool users** know Nano Banana / GPT Image exist but can't write prompts that actually make their photos look professional.

---

## 3. Target Users

**Free tier (acquisition)**
- Casual phone photographers, Gen Z and millennials
- Hobbyists with beginner DSLRs
- First-time AI image tool users

**Paid tier ($14/mo, target conversion)**
- Content creators (IG, TikTok, YouTube)
- Small business owners doing their own product / headshot photos
- Real estate, food, e-commerce sellers
- Long-term: B2B white-label for med-spa / hospitality use cases

---

## 4. Core Features

### 4.1 Coach Mode — Live Camera Director

**Flow**:
1. User opens `/coach` → browser prompts for camera permission
2. Live preview of rear camera fills screen
3. User taps the big **Analyze** button at the bottom
4. App captures one frame, uploads to Supabase, calls `/analyze?mode=coach`
5. Vision AI returns JSON → app overlays a bottom sheet with:
   - Scene detected (e.g. "indoor portrait, soft window light")
   - Pose suggestion (one specific instruction)
   - Settings (camera mode + focus point + exposure tip)
   - Framing tip (composition)
   - Warnings (if scene has problems like backlight)
6. User swipes sheet up for detail, swipes down to re-analyze

**Critical UX rule**: The Analyze button must always be reachable with the thumb of whichever hand is holding the phone. Bottom-center, 60px tall, 80px from the bottom edge.

### 4.2 Settings Mode — Scenario Cheat Sheets

**Flow**:
1. User opens `/settings`
2. Sees a 2-column grid of 8 scenarios
3. Taps one → instant cheat sheet (no API call, all static data)

**Scenarios** (v1):
1. Portrait (single person)
2. Group photo (3+ people)
3. Sunset / golden hour
4. Food / flat lay
5. Low light / night
6. Action / movement
7. Architecture / interior
8. Pet / kids

**Device families** (detected from user-agent):
- iPhone 12–15 (and Pro/Max variants)
- Pixel 6+
- Samsung Galaxy S22+
- Generic Android
- DSLR / Mirrorless (user manually selects)

**Card content per scenario × device**:
- Recommended camera mode (Portrait, Photo, Pro, Night, etc.)
- ISO range
- Shutter speed (for DSLRs)
- Aperture or "Portrait mode strength" equivalent
- Focus point instruction
- One pro tip ("hold your breath when shooting handheld below 1/60s")

### 4.3 Prompt Mode — AI Prompt Generator

> See [FEATURE-1.md](FEATURE-1.md) for the expanded v1 spec (structured intent input + in-app fal.ai generation).

**Flow** (original PRD version):
1. User opens `/prompt`
2. Taps "Upload photo" → file picker or drag/drop
3. Photo uploads to Supabase Storage bucket `photos`
4. App calls `/analyze?mode=prompt`
5. Vision AI returns:
   - Scene detected
   - Top 3 issues with the photo
   - Main prompt (1 sentence, paste-ready)
   - 2 alternative prompts (film, B&W, cinematic — variety)
6. User taps Copy → opens external AI image tool → pastes

---

## 5. Technical Architecture

### Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) on Vercel | Mobile-first PWA, fast deploys, free tier |
| Backend | Python FastAPI on existing VPS | Matches stack preference, full control, cheap |
| Vision AI | Gemini 2.5 Flash (primary), Claude Haiku (fallback) | Cheap + fast for v1; behind adapter for swap |
| Image gen | fal.ai FLUX Pro Kontext (paid tier only) | Identity-preserving image-to-image |
| Auth | Supabase Auth (Google + magic link) | Free, mobile-friendly |
| DB | Supabase Postgres | Already in stack |
| File storage | Supabase Storage, bucket `photos` | Same project, no S3 setup |
| Payments | Stripe (added Week 4) | Industry standard |
| Analytics | PostHog free tier | Self-host option later |

### Data flow

```
[User phone] --upload--> [Next.js client]
                                |
                  upload to Supabase Storage
                                |
            POST /analyze?mode=suggest|prompt
                                v
                       [FastAPI on VPS]
                                |
                  check auth + rate limit
                                |
                       call ai.py adapter
                                v
                    [Gemini 2.5 Flash API]
                                |
                     parse + validate JSON
                                |
                   write row to `analyses`
                                v
                      return JSON to client
                                |
              (paid only) POST /generate
                                v
                  [fal.ai FLUX Pro Kontext]
                                |
                  enhanced image to Storage
                                v
                      return URL to client
```

### Why this stack (decisions log)

- **Why Next.js, not pure HTML?** PWA install, image optimization, easy Vercel deploy, his existing comfort.
- **Why FastAPI, not Next.js API routes?** He wants Python backend; VPS already paid for; avoids Vercel 12-function limit hit before.
- **Why one `/analyze` endpoint with a mode param?** Same consolidation pattern as LeadEngine. Easier to deploy, monitor, rate-limit.
- **Why Gemini Flash, not Claude as primary?** Cheaper per call, vision-capable, fast. Quality is "good enough" for coaching. Claude as fallback for nuanced prompts.
- **Why not n8n for backend?** File upload + streaming vision responses are awkward over n8n webhooks. n8n added later for cron jobs (e.g., weekly digest emails to paid users).

---

## 6. Database Schema

Run this in Supabase SQL editor on day 1:

```sql
-- profiles: extends Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  device_family text, -- 'iphone_15', 'pixel_8', 'samsung_s24', 'android_generic', 'dslr'
  created_at timestamptz not null default now()
);

-- analyses: history of every Coach/Prompt run
create table analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('coach', 'prompt', 'settings', 'suggest')),
  input_image_url text, -- null for settings mode
  output_data jsonb not null,
  created_at timestamptz not null default now()
);
create index analyses_user_created_idx on analyses(user_id, created_at desc);

-- saved_prompts: paid users only, favorites from Prompt Mode
create table saved_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  prompt_text text not null,
  source_image_url text,
  created_at timestamptz not null default now()
);

-- daily_usage: free tier rate limit
create table daily_usage (
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null default current_date,
  count integer not null default 0,
  primary key (user_id, date)
);

-- settings_cards: static cheat sheets for Settings Mode (edit via Supabase UI)
create table settings_cards (
  id uuid primary key default gen_random_uuid(),
  scenario text not null, -- 'portrait', 'sunset', etc.
  device_family text not null,
  card_data jsonb not null, -- {mode, iso, shutter, aperture, focus, tip}
  unique (scenario, device_family)
);

-- public_shares: powers /p/<slug> public URLs (added per FEATURE-1.md)
create table public_shares (
  slug text primary key,
  analysis_id uuid not null references analyses(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  is_public boolean not null default true,
  face_blur boolean not null default false,
  created_at timestamptz not null default now()
);
create index public_shares_analysis_idx on public_shares(analysis_id);

-- Row Level Security
alter table profiles enable row level security;
alter table analyses enable row level security;
alter table saved_prompts enable row level security;
alter table daily_usage enable row level security;
alter table public_shares enable row level security;

create policy "users read own profile" on profiles for select using (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);
create policy "users read own analyses" on analyses for select using (auth.uid() = user_id);
create policy "users read own saved" on saved_prompts for select using (auth.uid() = user_id);
create policy "users insert own saved" on saved_prompts for insert with check (auth.uid() = user_id);
-- settings_cards is public read
create policy "anyone read cards" on settings_cards for select using (true);
-- public_shares: anyone reads when is_public; user manages their own
create policy "anyone reads public shares" on public_shares for select using (is_public = true);
create policy "users manage own shares" on public_shares for all using (auth.uid() = user_id);
```

---

## 7. API Contract

### Endpoint: `POST /analyze`

**Auth**: Supabase JWT in `Authorization: Bearer <token>` header (optional for anonymous users — see FEATURE-1.md).

**Request body** (multipart/form-data):

```
mode: "suggest" | "prompt" | "coach" | "settings"
image: <file>           # required for suggest, prompt, coach
scenario: string        # required for settings, omit for others
device_family: string   # optional, helps tailor advice
pose, background, lighting, style, focus: string  # required for mode=prompt
freetext: string        # optional for mode=prompt
```

**Response (200)**:

```json
{
  "ok": true,
  "mode": "prompt",
  "data": { /* see FEATURE-1.md for shape per mode */ },
  "usage": { "count_today": 3, "limit": 5, "plan": "free" }
}
```

**Response (429 — rate limited)**:

```json
{ "ok": false, "error": "rate_limit", "message": "Free tier limit reached. Upgrade for unlimited." }
```

**Response (400 — bad input)**:

```json
{ "ok": false, "error": "no_subject_detected", "message": "Couldn't find a clear subject. Try again with better lighting." }
```

### Endpoint: `POST /generate` (paid-only)

See FEATURE-1.md for full contract.

---

## 8. AI System Prompts

> The Coach Mode prompt is below. The `suggest` and `prompt` mode system prompts are in [FEATURE-1.md](FEATURE-1.md), which supersedes the original Prompt Mode prompt here.

### Coach Mode system prompt

```
You are a professional photo director coaching someone in real-time.
You will see ONE image from their phone's rear camera.

Return ONLY valid JSON in this exact shape:
{
  "scene": "1-4 word scene description, e.g. 'indoor portrait, soft window light'",
  "pose": "ONE sentence. Specific body position. NEVER write 'smile' alone.",
  "settings": {
    "mode": "Portrait | Photo | Pro | Night | Action",
    "focus_point": "Where to tap to focus, e.g. 'subject's eyes'",
    "exposure_tip": "e.g. '+0.3 EV' OR 'tap and slide down to darken'",
    "extra": "ONE tip specific to this scene"
  },
  "framing": "ONE sentence on composition (rule of thirds, leading lines, headroom).",
  "warnings": ["Issues to fix first, e.g. 'subject backlit — turn 90° toward window'. Empty array if none."]
}

Hard rules:
- Phone apertures are FIXED. Never tell the user to change f-stop on a phone.
- Be specific. "Smile" is bad. "Turn 45° from camera, tilt chin down slightly, soft smile" is good.
- If scene is unclear/dark/empty: return warnings only, leave pose empty string.
- Total response under 200 words.
- Output JSON only. No markdown, no preamble.
```

---

## 9. Mobile-First Design Rules

(Mobile-first design rules — apply to every screen)

- Target viewport: **375px width** (iPhone SE / smallest common phone)
- All touch targets: **minimum 44×44px**
- No hover-dependent UI
- Bottom-safe padding: `env(safe-area-inset-bottom)` so nothing hides behind iOS home indicator
- Use **bottom sheets**, never centered modals
- Primary action button: always bottom-center, thumb-reachable, 80px from bottom edge
- Loading states: skeleton shimmer, not spinners
- Camera permission denied: show clear path to enable in browser settings, never a dead end
- All API calls have a 10s timeout with retry button
- Works fully offline for Settings Mode (cache the cards)

---

## 10. Free vs Paid Tier

| Feature | Free | Paid ($14/mo) |
|---|---|---|
| Coach Mode analyses | 5/day | Unlimited |
| Prompt Mode generations | 3/day | Unlimited |
| **In-app fal.ai image generation** | **0 (1 lifetime trial)** | **Unlimited** |
| Settings Mode | Unlimited | Unlimited |
| History | Last 7 days | 90 days |
| Saved prompts | 0 | Unlimited |
| Custom prompt styles | No | Yes (Cinematic, Film, B&W, Editorial, etc.) |
| Export prompts (CSV/TXT) | No | Yes |
| Watermark on shared cards / public URLs | Yes | No |
| Public URL privacy toggle | No | Yes |
| Priority AI model (Claude Sonnet) | No | Yes |

**Pricing rationale**: $14/mo undercuts Adobe / Lightroom mobile but signals premium vs $5 hobby apps. Stripe annual option at $120/yr (28% off) for stickiness.

---

## 11. Build Roadmap (4 weeks)

> Week 1 has been revised per [FEATURE-1.md](FEATURE-1.md) to focus on Photo Enhancer with Prompt (the highest-activation entry point).

### Week 1 — Foundation + Feature 1 (Photo Enhancer with Prompt)

See [FEATURE-1.md](FEATURE-1.md) for the day-by-day plan.

### Week 2 — Settings Mode

| Day | Deliverable |
|---|---|
| 1 | `/settings` page UI: 8-scenario grid. |
| 2 | `settings_cards` table seeded with 8 scenarios × 5 device families = 40 cards. |
| 3 | Device detection logic from user-agent. Fallback to "let user pick". |
| 4 | Card detail view (bottom sheet) + SEO-friendly URL per card (`/cards/iphone-14/sunset`). |
| 5 | Save scenario taps to `analyses` (no image, mode='settings'). |
| 6 | Offline cache via service worker — Settings Mode must work with no internet. |
| 7 | QA + deploy. |

**Definition of done (Week 2)**: User can tap "Portrait" on an iPhone 14 and see specific Portrait Mode settings within 1 second, no API call.

### Week 3 — Coach Mode

| Day | Deliverable |
|---|---|
| 1 | `getUserMedia` rear-camera setup. Permission denied flow. |
| 2 | Live preview component, full-screen on mobile. |
| 3 | Big bottom Analyze button. Capture frame on tap. |
| 4 | Upload frame to Supabase Storage. Call `/analyze?mode=coach`. |
| 5 | Bottom-sheet result overlay. Swipe gestures. |
| 6 | Edge cases: bad lighting, no subject, slow network, low battery warning. |
| 7 | QA on iPhone, Android, slow 4G. Deploy. |

**Definition of done (Week 3)**: User opens app at a restaurant, points camera at their plate, taps Analyze, gets "shoot from 45° above, tap to focus on the main dish, +0.3 EV" within 3 seconds.

### Week 4 — Paid tier + launch

| Day | Deliverable |
|---|---|
| 1 | Stripe products + checkout. Supabase webhook updates `profiles.plan`. |
| 2 | Rate limit middleware. Free users hit 429 after limits. Upgrade CTA. |
| 3 | `/history` page (paid only). |
| 4 | PWA manifest, app icon, install prompt. Daily-scenario push (optional). |
| 5 | Landing page polish + 30-second demo video. |
| 6 | Soft launch: post to X, r/photography, r/iPhoneography. |
| 7 | Monitor metrics. Fix top-3 bugs from real users. |

**Definition of done (v1 launch)**: 100+ signups in first 7 days. Conversion tracking working. At least 1 paid customer.

---

## 12. Success Metrics

> Revised per activation brainstorming — free tier measured on 7-day return (event-driven cadence), paid tier on D1/D7 (daily-shooter cadence).

| Metric | Tier | Target | How to measure |
|---|---|---|---|
| 7-day return | Free | ≥ 50% | PostHog cohort |
| D1 retention | Paid | ≥ 50% | PostHog cohort |
| D7 retention | Paid | ≥ 25% | PostHog cohort |
| Free → Paid conversion | — | ≥ 3% within 14 days | Stripe + Supabase join |
| Avg analyses/active user/day | Paid | ≥ 4 | Query `analyses` |
| Avg analyses/active user/day | Free | ≥ 1.5 | Query `analyses` |
| Time from landing → first analyze | — | ≤ 30s | PostHog funnel |
| API cost per active user/month | — | ≤ $0.20 (free) / ≤ $1.50 (paid, incl. fal.ai) | Sum of API spend / MAU |

---

## 13. Environment Variables

```bash
# Frontend (Vercel)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=https://api.poselab.com

# Backend (VPS)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=    # NOT the anon key — write access
GEMINI_API_KEY=
ANTHROPIC_API_KEY=            # fallback / paid tier
FAL_API_KEY=                  # fal.ai for image generation
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENTRY_DSN=                   # error tracking
AI_PRIMARY=gemini             # gemini | claude — easy swap
```

All secrets go to `/root/.secrets.env` on VPS, never to git.

---

## 14. Repo Structure

```
poselab/
├── docs/
│   ├── PRD.md                       # this file
│   └── FEATURE-1.md                 # active Week 1 plan
├── web/                             # Next.js → Vercel
│   ├── app/
│   │   ├── page.tsx                 # Landing + mode picker
│   │   ├── enhance/page.tsx         # Feature 1 (Photo Enhancer)
│   │   ├── coach/page.tsx           # Week 3
│   │   ├── settings/page.tsx        # Week 2
│   │   ├── p/[slug]/page.tsx        # Public share page (Feature 1)
│   │   └── api/health/route.ts      # one frontend ping
│   ├── components/                  # PhotoUpload, EnhanceForm, etc.
│   ├── lib/                         # supabase, api wrapper, device detect
│   └── public/manifest.json
├── api/                             # FastAPI → VPS
│   ├── main.py                      # entry + routes
│   ├── analyze.py                   # /analyze handler
│   ├── generate.py                  # /generate handler → fal.ai
│   ├── ai.py                        # Gemini/Claude adapter
│   ├── fal.py                       # fal.ai adapter
│   ├── prompts.py                   # system prompts
│   ├── auth.py                      # Supabase JWT verify
│   ├── shares.py                    # public_shares helpers
│   ├── ratelimit.py                 # free tier counter
│   ├── requirements.txt
│   └── Dockerfile
└── README.md
```

---

## 15. Out of Scope (v1)

- Native iOS / Android apps (PWA covers it)
- Real-time continuous video analysis (one frame per tap)
- Social feed / community
- In-app photo editing beyond the single fal.ai pass (no layer-level edits)
- Multi-language (English only at launch)
- Team accounts / multi-user

---

## 16. V2 Ideas (post-launch, do not build now)

- AR pose overlay (ghost figure showing where subject should stand)
- Reference photo matching ("make my photo look like this one")
- Group pose suggester (5+ people staging)
- Phone-specific deep integration (Halide, ProCam deep links)
- White-label tier for photographers' clients
- B2B med-spa / hospitality version with branded receptionists
- Browser extension (right-click any web photo → "Get the prompt")
- iOS Share extension (analyze any photo from camera roll)
- Walk-and-shoot mode (passive scene scoring)
- Hybrid AI + human review (paid upsell)

---

## 17. First Action Items (Day 1)

1. ~~Pick the final name~~ — *deferred (see Open Decisions in FEATURE-1.md)*
2. Create Supabase project at supabase.com, free tier
3. Create GitHub repo (private), name `poselab`
4. Run `pnpm create next-app@latest web --typescript --tailwind --app`
5. SSH to VPS, `mkdir poselab-api && cd poselab-api && python -m venv .venv`
6. Save this PRD to `/docs/PRD.md` in the repo ✅
7. Read [FEATURE-1.md](FEATURE-1.md) and begin Week 1 Day 1 deliverables

---

**End of PRD v1.0**
