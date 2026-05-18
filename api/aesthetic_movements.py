"""Aesthetic movements — named visual philosophies per style.

Pattern adapted from Anthropic's official skills:
  - canvas-design: "Name the movement (1-2 words). Emphasize craftsmanship
    REPEATEDLY — phrases like 'meticulously crafted', 'master-level execution'."
  - theme-factory: pre-curated themes with hex codes, font pairings, named for
    what they evoke ("Ocean Depths", "Golden Hour", "Midnight Galaxy").
  - frontend-design: "Commit to a BOLD aesthetic direction... intentionality,
    not intensity. NEVER use generic AI aesthetics."

For each user-selectable style, we pre-name an aesthetic movement and ground
it in concrete photographic detail (hex palettes, light direction, signature
techniques). The image model gets a named look + hex grading + craftsmanship
phrasing — three signals that all live deep in editorial captions.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AestheticMovement:
    """A named visual philosophy for a chosen Style."""

    style_key: str  # matches a Suggestions.style value
    name: str  # the named movement, evocative and specific
    one_line: str  # a 1-line manifesto
    lineage: str  # named photographers/colorists this look traces from
    hex_palette: tuple[str, ...]  # 3-5 hex values describing the grade
    light_signature: str  # the light recipe in plain words
    craftsmanship_phrases: tuple[str, ...]  # phrases that signal "pro work"
    # Scenarios this movement fits best — picker uses these to disambiguate
    # when multiple movements share the same style_key. "all" means it works
    # for any scenario. Examples:
    #   ("portrait", "group")  → only matches portrait + group scenarios
    #   ("all",)               → catch-all default
    scenarios: tuple[str, ...] = ("all",)


MOVEMENTS: tuple[AestheticMovement, ...] = (
    AestheticMovement(
        style_key="Editorial",
        name="Magazine Restraint",
        one_line=(
            "Lindbergh honesty meets Avedon stillness — the photo trusts "
            "the subject without props or theatrics."
        ),
        lineage=(
            "Peter Lindbergh (honest unretouched skin), Richard Avedon "
            "(controlled negative space), Pratik Naik (high-end retouch)"
        ),
        hex_palette=(
            "#F7EFE6",  # paper-white background
            "#E8C5A3",  # warm skin highlight
            "#C28B6C",  # mid skin
            "#7D5847",  # deep skin shadow
            "#2A2522",  # near-black anchor
        ),
        light_signature=(
            "soft daylight from a single large source — north-facing window, "
            "5:1 ratio, light skimming across the face from camera-left"
        ),
        craftsmanship_phrases=(
            "meticulously retouched with frequency separation",
            "master-level dodge-and-burn sculpting",
            "the product of restraint, not stylization",
            "every tonal transition carefully placed",
        ),
    ),
    AestheticMovement(
        style_key="Cinematic",
        name="Blockbuster Polish",
        one_line=(
            "Sonnenfeld orange-and-teal applied with Joel-Grimes drama — "
            "every shadow placed for separation, every highlight warm enough "
            "to feel character-lit."
        ),
        lineage=(
            "Stefan Sonnenfeld (Bad Boys II, the orange-teal codifier), Joel "
            "Grimes (composite portrait drama), Calvin Hollywood (Freaky Details)"
        ),
        hex_palette=(
            "#F4B789",  # warm orange highlight on skin
            "#E08555",  # mid skin warmed
            "#8C3D1F",  # deep warm shadow
            "#264D52",  # teal shadow / background
            "#0F1A1D",  # crushed-but-not-black darkest
        ),
        light_signature=(
            "key light slightly behind and above camera-left, fill 4 stops "
            "below; subject lit warm, background graded toward teal cyan"
        ),
        craftsmanship_phrases=(
            "meticulously color-graded with orange-and-teal separation",
            "master-level shadow placement",
            "the result of countless hours of grading refinement",
            "every micro-contrast intentional",
        ),
    ),
    AestheticMovement(
        style_key="Film (Portra 400)",
        name="1990s Travel Editorial",
        one_line=(
            "The Kodak Portra 400 wedding-and-travel look — warm skin, "
            "lifted blacks, the moment-after-the-laugh aesthetic."
        ),
        lineage=(
            "Kodak Portra 400 film stock (1998-present), Sally Mann (warm "
            "monochrome family work), VSCO/Mastin film LUT tradition"
        ),
        hex_palette=(
            "#EFE3D2",  # cream highlight
            "#DCA887",  # peach skin
            "#A56F50",  # warm midtone
            "#5D4438",  # lifted black (never true #000)
            "#3A2C24",  # warmest shadow anchor (still not pure black)
        ),
        light_signature=(
            "open shade or overcast diffusion — soft, wrapping, no harsh "
            "shadows; slight magenta cast in shadows, peachy warmth in "
            "highlights"
        ),
        craftsmanship_phrases=(
            "rendered in 1990s Kodak Portra 400 palette",
            "lifted blacks the way film actually behaves",
            "subtle film grain, never digital cleanliness",
            "the warmth of a well-aged emulsion",
        ),
    ),
    AestheticMovement(
        style_key="B&W",
        name="Modernist Light",
        one_line=(
            "Channel-mixer luminance control in the Ansel Adams / Avedon "
            "tradition — deep blacks, controlled highlights, every tone "
            "placed on a zone."
        ),
        lineage=(
            "Ansel Adams (Zone System), Richard Avedon (B&W portrait master), "
            "Peter Lindbergh (B&W natural light), Yousuf Karsh (chiaroscuro)"
        ),
        hex_palette=(
            "#F2F2F2",  # zone IX — paper white
            "#B8B8B8",  # zone VII — bright skin
            "#7A7A7A",  # zone V — middle gray
            "#3B3B3B",  # zone II — deep shadow with detail
            "#0A0A0A",  # zone 0 — true black anchor
        ),
        light_signature=(
            "single hard or soft key light from one side — chiaroscuro that "
            "carves bone structure; shadow side carries detail, never "
            "blocks up"
        ),
        craftsmanship_phrases=(
            "channel-mixer conversion in the Ansel Adams tradition",
            "every zone placed with master-level tonal control",
            "deep true black anchored at zone 0",
            "dodge-and-burn that reveals form, not gimmick",
        ),
    ),
    AestheticMovement(
        style_key="Natural",
        name="Documentary Truth",
        one_line=(
            "Cartier-Bresson decisiveness with no grading affectation — the "
            "look of a frame that earned itself."
        ),
        lineage=(
            "Henri Cartier-Bresson (decisive moment), Steve McCurry "
            "(unguarded humanity), Andrew Scrivani (honest food light)"
        ),
        hex_palette=(
            "#FFFFFF",  # accurate white
            "#E8B894",  # natural skin highlight
            "#B7805B",  # natural skin mid
            "#5C3A29",  # natural skin shadow
            "#000000",  # true black
        ),
        light_signature=(
            "available light only — window, golden hour, overcast sky. "
            "Whatever was there at the moment, honored faithfully"
        ),
        craftsmanship_phrases=(
            "honest tonal range, no Instagram filter",
            "skin tones rendered accurately, not pushed",
            "high-pass output sharpening, no heavy grading",
            "the result of a frame that didn't need to be saved",
        ),
    ),
    # ─────────────────────────────────────────────────────────────────────
    # SECOND Editorial movement — scenario-disambiguated. Picker prefers
    # this one when the photo is architecture / interior / food, falling
    # back to "Magazine Restraint" for portrait/group.
    # ─────────────────────────────────────────────────────────────────────
    AestheticMovement(
        style_key="Editorial",
        name="Brooklyn Window Light",
        one_line=(
            "The Architectural Digest / Kinfolk interior aesthetic — soft "
            "north-facing window light, neutral linens, ceramics, plants, "
            "the lived-in stillness of a quiet morning."
        ),
        lineage=(
            "Pia Ulin (Kinfolk interiors), Trevor Tondro (Architectural "
            "Digest), Saul Leiter (urban-still-life sensibility)"
        ),
        hex_palette=(
            "#F4EDE2",  # bone-white wall / linen
            "#D9C9B0",  # warm oat midtone
            "#A88E72",  # tobacco wood / leather
            "#5D513F",  # bistre shadow
            "#1F1A14",  # near-black anchor in shadows
        ),
        light_signature=(
            "single tall north-facing window casting soft directional light "
            "across the scene; long shadows from low winter sun; no fill "
            "except gentle ambient bounce from neutral walls"
        ),
        craftsmanship_phrases=(
            "Kinfolk-magazine restraint with master-level styling",
            "the patience of a still life that was waited for, not posed",
            "neutral palette controlled to within 5% saturation variance",
            "highlight rolloff like film, no clipped white",
        ),
        scenarios=("architecture", "food", "macro", "other"),
    ),
)


# ─── Picker ──────────────────────────────────────────────────────────────────
# Build a style → list-of-movements index. Order preserved from MOVEMENTS,
# so the FIRST entry for a style is the default unless a more-specific
# scenario match is available.
_BY_STYLE: dict[str, list[AestheticMovement]] = {}
for _m in MOVEMENTS:
    _BY_STYLE.setdefault(_m.style_key, []).append(_m)


def movement_for(
    style: str, scenario: str | None = None
) -> AestheticMovement | None:
    """Pick the best aesthetic movement for a style (+ optional scenario).

    Priority:
      1. A movement whose `scenarios` explicitly lists this scenario.
      2. A movement whose `scenarios` is ("all",) — generic for the style.
      3. Otherwise: the first registered for the style key.
      4. None when the style key isn't registered at all.

    This is what makes "Editorial" mean different things for a portrait
    (Magazine Restraint) vs an architecture shot (Brooklyn Window Light).
    """
    candidates = _BY_STYLE.get(style.strip())
    if not candidates:
        return None

    if scenario:
        # First: exact scenario match
        for m in candidates:
            if scenario in m.scenarios:
                return m
        # Then: "all" generic for the style
        for m in candidates:
            if "all" in m.scenarios:
                return m

    return candidates[0]


def format_movement_for_prompt(m: AestheticMovement) -> str:
    """Compact reference for the prompt builder.

    Optimized for vision models — names + hex + light + craftsmanship phrases
    that all live in editorial captions in their training data.
    """
    palette = ", ".join(m.hex_palette)
    craft = "; ".join(m.craftsmanship_phrases)
    return (
        f"NAMED AESTHETIC: '{m.name}' — {m.one_line}\n"
        f"  Lineage: {m.lineage}\n"
        f"  Hex palette to target: {palette}\n"
        f"  Light signature: {m.light_signature}\n"
        f"  Craftsmanship language to use: {craft}"
    )
