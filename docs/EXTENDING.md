# Extending PoseLab

PoseLab's architecture deliberately separates **knowledge** (what masters
know) from **techniques** (how to apply it) from **aesthetic movements**
(named looks) from **providers** (which API does the work). Adding to any
of these layers takes 5-50 lines and lights up the entire pipeline
automatically.

This doc walks through the five most common extensions, in order of
increasing scope.

---

## 1. Add a new AI provider preset (1 file, ~10 lines)

If a provider is OpenAI-compatible (same `/chat/completions` shape) you
don't need a new adapter — just a preset entry in the Settings UI so
users see it in the dropdown.

**File:** `web/lib/settings.ts`

```ts
// In AI_PRESETS:
{
  id: "fireworks",
  label: "Fireworks AI (Llama, DeepSeek, Mixtral)",
  baseUrl: "https://api.fireworks.ai/inference/v1",
  visionModel: "accounts/fireworks/models/llama-v3p2-90b-vision-instruct",
  textModel: "accounts/fireworks/models/llama-v3p1-70b-instruct",
  keyHint: "fw_...",
  signupUrl: "https://fireworks.ai/api-keys",
},
```

Done. Restart Next; the preset appears in the Settings modal dropdown.

---

## 2. Add a new edit technique (1 file, ~25 lines)

Edit techniques get **auto-selected** when they match the user's chosen
style / focus / scenario or any detected issue. No selector code to write.

**File:** `api/edit_techniques.py`

```python
# Add to TECHNIQUES tuple:
EditTechnique(
    name="Cross-processing color shift",
    sources=("1990s film lab technique", "Wes Anderson grade tradition"),
    what_it_does=(
        "Pushes color in unexpected directions — greens in shadows, "
        "magentas in highlights — by 'developing the wrong film stock' "
        "for the chemistry."
    ),
    when_to_use=(
        "When the user wants a stylized, vintage, slightly-off color feel"
    ),
    ai_translation=(
        "cross-process the image — push green into the shadows, slight "
        "magenta into highlights, lifted blacks, the look of slide film "
        "developed in C-41 chemistry"
    ),
    style_affinities=("Cinematic", "Film (Portra 400)"),
    issue_keywords=("flat color", "boring", "drab"),
    scenarios=("portrait", "lowlight"),
),
```

The `style_affinities` + `issue_keywords` + `scenarios` together drive
selection. The `ai_translation` is the natural-language form that the
prompt-mode AI weaves into the final paste-ready prompt.

---

## 3. Add a new aesthetic movement (1 file, ~25 lines)

Aesthetic movements are **named looks with hex palettes** that anchor the
style-mode output. They're keyed to one of the 5 user-pickable styles.

**File:** `api/aesthetic_movements.py`

```python
# Add to MOVEMENTS tuple:
AestheticMovement(
    style_key="Cinematic",  # must match an existing Style option
    name="Wes Anderson Symmetry",
    one_line=(
        "Pastel palette, symmetric composition, theatrical artificial "
        "light — the look of Grand Budapest and Asteroid City."
    ),
    lineage="Wes Anderson, Robert Yeoman (DP)",
    hex_palette=(
        "#F5D9B8",  # cream highlight
        "#E89E5F",  # pumpkin midtone
        "#7C4A2D",  # warm shadow
        "#3F5F7A",  # muted teal
        "#1A1F26",  # ink black
    ),
    light_signature=(
        "flat front-lit subject, even key + fill, no harsh shadow; "
        "theatrical artificial color from props in the scene"
    ),
    craftsmanship_phrases=(
        "meticulously composed for symmetric framing",
        "Wes-Anderson-style pastel palette",
        "the result of obsessive set design",
        "every prop placed with intention",
    ),
),
```

The first user to pick "Cinematic" as their style will see this in their
prompt's vocabulary. Multiple movements per style work — the prompt
builder picks the first match.

---

## 4. Add a new photo scenario (2 files, ~80 lines)

Scenarios are the broadest extension — they introduce a new lineage of
photographers and a complete principle set.

### Step A: extend the KB

**File:** `api/knowledge.py`

```python
PRODUCT = ScenarioKB(
    label="Product / e-commerce",
    lineage=(
        Photographer("Tim Walker", "Theatrical, fairy-tale product context..."),
        Photographer("Andrew Zuckerman", "White-seamless, hyper-clean detail..."),
        Photographer("Joel Grimes", "Composite product into dramatic environment..."),
    ),
    principles=(
        Principle(
            rule="Choose between white seamless OR contextual environment — never half-committed.",
            why="Mixed signals (slightly-cluttered background) read as amateur.",
            trace="Zuckerman vs Walker traditions",
            violations=(
                "product on a 'kitchen counter' without intentional styling",
                "cluttered backdrop that competes with the product",
            ),
        ),
        # ... 3-5 more principles
    ),
    red_flags=("dust visible at this resolution", "edges merge with background", ...),
    aesthetic_targets=("razor-sharp on the hero element", "color truth", ...),
)

# Then add to KB dict:
KB: dict[Scenario, ScenarioKB] = {
    ...,
    "product": PRODUCT,
}
```

### Step B: register the literal type

Update the `Scenario` literal at the top of `knowledge.py`:

```python
Scenario = Literal[
    "portrait", "group", "sunset", "food", "lowlight",
    "action", "architecture", "pets",
    "product",  # ← new
    "other",
]
```

Also add `"product"` to:
- `prompts.DETECT_SCENARIO_PROMPT`'s categories list (so the AI can classify into it)
- `web/lib/types.ts` `Scenario` literal union
- `web/lib/types.ts` `SCENARIO_LABEL_OVERRIDES` if "Pose" should read as
  "Angle & framing" for products (it probably should)

That's it — the AI will start classifying photos into the new scenario,
and the prompt builder will use its principles + lineage automatically.

---

## 5. Add a new image-gen provider (~80 lines)

This is the biggest extension — needs a new adapter file plus wiring in
both the backend ProviderConfig and the frontend Settings UI.

### Step A: write the adapter

**New file:** `api/<name>_image.py`

Pattern (steal from `api/runware_image.py` or `api/openai_image.py`):

```python
"""Stability.ai image-edit adapter."""

from __future__ import annotations
import base64, io, logging, os, time
import httpx
from PIL import Image
from providers import ProviderConfig

logger = logging.getLogger(__name__)
STABILITY_BASE_URL = "https://api.stability.ai/v2beta"


async def generate(
    *,
    prompt: str,
    image_bytes: bytes,
    cfg: ProviderConfig,
) -> tuple[bytes, int, str]:
    """Return (image_bytes, duration_ms, model_id)."""
    started = time.monotonic()

    if not cfg.stability_configured:
        duration = int((time.monotonic() - started) * 1000)
        return image_bytes, duration, "mock/echo"

    # ... POST to STABILITY_BASE_URL with cfg.stability_key, image as
    # multipart, prompt, return image bytes
    ...
    return out_jpeg, duration_ms, cfg.stability_model
```

Required contract:
- One function called `generate(prompt, image_bytes, cfg)`.
- Returns `(bytes, duration_ms, model_id)`.
- If `cfg.<provider>_configured` is False, echo the source bytes — keeps
  the mock-mode UI flow working.

### Step B: extend ProviderConfig

**File:** `api/providers.py`

```python
H_STABILITY_KEY = "x-stability-key"
H_STABILITY_MODEL = "x-stability-model"

# Update Literal:
ImageProvider = Literal["openai", "fal", "runware", "stability", "auto"]

# Add fields to ProviderConfig:
stability_key: str
stability_model: str

@property
def stability_configured(self) -> bool:
    return bool(self.stability_key)

# Update resolved_image_provider() order:
def resolved_image_provider(self) -> str:
    if self.image_provider != "auto":
        return self.image_provider
    if self.runware_configured: return "runware"
    if self.openai_image_configured: return "openai"
    if self.stability_configured: return "stability"
    if self.fal_configured: return "fal"
    return "openai"

# Add reads in get_provider_config():
stability_key=_header_or_env(request, H_STABILITY_KEY, "STABILITY_API_KEY"),
stability_model=_header_or_env(
    request, H_STABILITY_MODEL, "STABILITY_MODEL", "stable-diffusion-3-large"
),
```

### Step C: route in `/generate`

**File:** `api/main.py`

```python
import stability_image  # add to imports

# In the /generate handler:
if provider == "runware":
    raw, duration_ms, model_id = await runware_image.generate(...)
elif provider == "stability":  # ← new
    raw, duration_ms, model_id = await stability_image.generate(
        prompt=body.prompt, image_bytes=source_bytes, cfg=cfg
    )
elif provider == "fal":
    raw, duration_ms, model_id = await fal.generate(...)
else:
    raw, duration_ms, model_id = await openai_image.generate(...)
```

Also expose `stability_configured` in the `/config` endpoint.

### Step D: surface in Settings UI

**File:** `web/lib/settings.ts`

```ts
export type ImageProvider = "openai" | "fal" | "runware" | "stability" | "auto";

// Add fields to AppSettings + DEFAULT_SETTINGS:
stabilityKey: string;
stabilityModel: string;
```

In `DEFAULT_SETTINGS`:
```ts
stabilityKey: "",
stabilityModel: "stable-diffusion-3-large",
```

In `buildProviderHeaders()`:
```ts
if (s.stabilityKey) h["X-Stability-Key"] = s.stabilityKey;
if (s.stabilityModel) h["X-Stability-Model"] = s.stabilityModel;
```

### Step E: SettingsModal dropdown + key field

**File:** `web/components/SettingsModal.tsx`

Add `<option value="stability">Stability AI</option>` to the
image-provider dropdown and add two new `<Field>` rows for the key + model.

That's the full pattern. About 80 lines across 5 files; everything else
(rate-limit refund, error pass-through, mock fallback, identity-
preservation prompt framing) reuses the existing infrastructure.

---

## A note on layering

The four "knowledge" modules (`knowledge.py`, `edit_techniques.py`,
`aesthetic_movements.py`, plus the prompts themselves) compose like layers
in Photoshop:

```
   knowledge.py             ← what the masters know
        ↓
   edit_techniques.py       ← how to translate that to AI prompts
        ↓
   aesthetic_movements.py   ← what named look does the user want
        ↓
   prompts.py               ← composes the above into the final
                              edit-style instruction sent to the AI
```

Adding to a higher layer changes more behavior. Adding a new edit
technique affects what gets named in prompts. Adding a new scenario adds a
whole new analytical lens. Adding a new image provider doesn't change the
prompt logic at all — it just gives the user another delivery channel.

Pick the smallest layer that does what you want. Most useful extensions are
new techniques and new aesthetic movements — both are ~25 lines in one
file.
