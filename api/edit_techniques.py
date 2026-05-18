"""Photoshop-grade editing techniques catalog.

These are the named, well-documented retouching moves that working pros use
in Photoshop / Lightroom / DaVinci every day. Each entry includes:
  - the technique name (as it's known in the trade)
  - the retoucher(s) most associated with teaching it
  - what it actually does (visually)
  - when to use it (what problem it fixes)
  - how to phrase it in an AI-image prompt so models like FLUX Kontext,
    Nano Banana, ChatGPT Image and Gemini will reproduce the effect
  - which user-chosen styles it pairs with
  - which detected issues it addresses

Sources (researched May 2026):
  - Pratik Naik, Solstice Retouch — CreativeLive "The Art & Business of
    High-End Retouching", frequency separation course
  - Aaron Nace, Phlearn — dodge & burn curves-adjustment-layer method
  - Glyn Dewis — portrait dodge & burn + color grading tutorials
  - Joel Grimes — composite portrait method, dramatic edge lighting
  - Calvin Hollywood — "Freaky Details" hyperreal local-contrast technique
  - Stefan Sonnenfeld (Company 3) — orange & teal cinematic look,
    invented for Bad Boys II (2003)
  - Michael Orton — Orton Effect for landscapes (soft + sharp combined)
  - Sean Archer / various colorists — lift-gamma-gain three-way grading
  - Ansel Adams — zone-based luminance control (modern equivalent: channel
    mixer for B&W)
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EditingMaster:
    name: str
    known_for: str  # one sentence


@dataclass(frozen=True)
class EditTechnique:
    name: str  # the technique as it's known in the trade
    sources: tuple[str, ...]  # retouchers/colorists associated with it
    what_it_does: str  # visual effect, plain language
    when_to_use: str  # context where it helps
    ai_translation: str  # how to phrase it in an AI image prompt
    # Which user-chosen styles this pairs with (one of Suggestions.style)
    style_affinities: tuple[str, ...]
    # Substring keywords matched against detected issues (lowercased)
    issue_keywords: tuple[str, ...] = ()
    # Which scenarios this is especially relevant to ("all" for cross-cutting)
    scenarios: tuple[str, ...] = ("all",)


# ─────────────────────────────────────────────────────────────────────────────
# Editing masters — the people who set the bar
# ─────────────────────────────────────────────────────────────────────────────

EDITING_MASTERS: tuple[EditingMaster, ...] = (
    EditingMaster(
        "Pratik Naik (Solstice Retouch)",
        "Boutique high-end retoucher for commercial and editorial; teaches "
        "frequency separation, dodge-and-burn, and skin contouring on "
        "CreativeLive's 'Art & Business of High-End Retouching'.",
    ),
    EditingMaster(
        "Aaron Nace (Phlearn)",
        "Photoshop educator; codified the curves-adjustment-layer method "
        "for dodge & burn — sculpting light by painting on luminance masks "
        "rather than destructive burn/dodge tools.",
    ),
    EditingMaster(
        "Glyn Dewis",
        "Portrait + composite educator; ~20 years of Photoshop teaching, "
        "known for dramatic dodge & burn, color grading, and combining "
        "shadows + lighting + grade into a finished look.",
    ),
    EditingMaster(
        "Joel Grimes",
        "Composite portrait master; high-contrast dramatic lighting + "
        "seamless background swapping while retaining the original "
        "subject-cast shadow for realism.",
    ),
    EditingMaster(
        "Calvin Hollywood",
        "German digital artist; coined 'Freaky Details' — a hyperreal "
        "local-contrast boost that's somewhere between photo and "
        "illustration. Edgy, gritty, signature dark-edged style.",
    ),
    EditingMaster(
        "Stefan Sonnenfeld (Company 3)",
        "Colorist who invented the modern orange-and-teal cinematic look "
        "for Bad Boys II (2003); now the dominant blockbuster grade.",
    ),
    EditingMaster(
        "Michael Orton",
        "Landscape photographer who developed the 'Orton Effect' in the "
        "1980s — sandwiching a sharp slide with a blurred slide to create "
        "an ethereal soft-but-sharp glow.",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# The technique catalog
# ─────────────────────────────────────────────────────────────────────────────

TECHNIQUES: tuple[EditTechnique, ...] = (
    # ── Skin & portrait retouching ──────────────────────────────────────────
    EditTechnique(
        name="Frequency Separation",
        sources=("Pratik Naik", "Solstice Retouch"),
        what_it_does=(
            "Splits the image into a 'texture' layer (skin pores, eyelashes, "
            "fine hair) and a 'color/tone' layer (broader tonal smoothness). "
            "You smooth uneven tones on the color layer WITHOUT touching "
            "texture — the look that separates pro retouching from "
            "over-airbrushed plastic skin."
        ),
        when_to_use=(
            "Any close-up portrait where you want clean, even skin tones "
            "without losing the realism of pores, fine lines, and texture."
        ),
        ai_translation=(
            "retouch skin with frequency-separation precision — smooth "
            "tonal transitions and blemishes while preserving pore texture, "
            "fine skin detail, and natural skin grain; avoid plastic "
            "airbrush smoothness"
        ),
        style_affinities=("Editorial", "Cinematic", "Natural"),
        issue_keywords=("skin", "blemish", "smooth", "pore", "uneven"),
        scenarios=("portrait", "pets", "group"),
    ),
    EditTechnique(
        name="Dodge & Burn (sculpting with light)",
        sources=("Glyn Dewis", "Aaron Nace (Phlearn)", "Pratik Naik", "Joel Grimes"),
        what_it_does=(
            "Painting subtle lightness on highlights (cheekbone, brow "
            "ridge, bridge of nose, chin) and subtle shadow into shadow "
            "areas (under-eye, jawline, temples). Sculpts 3D form into a "
            "flat face using LIGHT rather than airbrushing or liquify."
        ),
        when_to_use=(
            "Portraits where the lighting was flat at capture, or where "
            "you want to enhance the existing bone structure subtly."
        ),
        ai_translation=(
            "apply subtle dodge-and-burn sculpting — brighten the highlights "
            "along the cheekbone, brow ridge, and bridge of nose; deepen "
            "the shadows in the eye sockets, under the jawline, and along "
            "the temples; build dimensionality through light, not "
            "airbrushing"
        ),
        style_affinities=("Editorial", "Cinematic", "B&W"),
        issue_keywords=("flat", "depth", "dimension", "sculpt", "shadow"),
        scenarios=("portrait", "group", "pets"),
    ),
    EditTechnique(
        name="Eye enhancement (selective brightening + sharpening)",
        sources=("Aaron Nace (Phlearn)", "Pratik Naik"),
        what_it_does=(
            "Brighten the iris very slightly, sharpen ONLY the eyes with "
            "a tight high-pass mask, deepen the pupil and outer iris ring "
            "to give the eyes more 'pop' without making them look fake."
        ),
        when_to_use=(
            "Almost every portrait benefits from this. The eyes are where "
            "the viewer lands; even a subtle enhancement reads as 'alive'."
        ),
        ai_translation=(
            "selectively enhance the eyes — brighten the iris subtly, "
            "sharpen detail around the iris and lashes, deepen the pupil "
            "and outer iris rim; eyes should look alive and luminous, not "
            "doll-like"
        ),
        style_affinities=("Editorial", "Cinematic", "Natural", "Film (Portra 400)"),
        issue_keywords=("eye", "dead eyes", "flat eyes"),
        scenarios=("portrait", "group", "pets"),
    ),
    # ── Color grading ───────────────────────────────────────────────────────
    EditTechnique(
        name="Orange & Teal cinematic grade",
        sources=("Stefan Sonnenfeld (Company 3)", "Bad Boys II (2003)"),
        what_it_does=(
            "Complementary color separation: skin tones and highlights "
            "warmed toward orange/peach; shadows, background, and sky "
            "pushed toward teal/cyan. Subject pops via color contrast — "
            "the modern blockbuster look."
        ),
        when_to_use=(
            "Portrait, commercial, or scene where the subject and "
            "environment are similar tones and you need separation. "
            "Especially powerful for indoor portraits with neutral "
            "backgrounds, or outdoor shots where sky/foliage need contrast."
        ),
        ai_translation=(
            "apply an orange-and-teal cinematic color grade — warm skin "
            "tones and highlights toward orange/peach, push shadows and "
            "background toward teal/cyan; subject separates from "
            "environment through complementary color contrast"
        ),
        style_affinities=("Cinematic",),
        issue_keywords=("cool", "flat color", "no separation", "blends"),
        scenarios=("portrait", "group", "lowlight", "action"),
    ),
    EditTechnique(
        name="Split toning (different colors in highlights vs shadows)",
        sources=("Lightroom / Camera Raw split-toning panel", "cinematic colorists"),
        what_it_does=(
            "Pushes highlights one direction (e.g. warm peach) and shadows "
            "another (e.g. cool blue or olive green). Subtler than orange-"
            "teal — adds mood without screaming 'graded'."
        ),
        when_to_use=(
            "Editorial portraits, fashion, lifestyle — anywhere a hint of "
            "mood is wanted but heavy cinematic contrast would feel forced."
        ),
        ai_translation=(
            "split-tone the image — warm peach hue in the highlights, "
            "cool olive-blue in the shadows; a subtle, editorial mood, "
            "not aggressive"
        ),
        style_affinities=("Editorial", "Film (Portra 400)"),
        issue_keywords=("mood", "flat", "drab"),
        scenarios=("portrait", "food", "lowlight"),
    ),
    EditTechnique(
        name="Lift-Gamma-Gain (three-way color)",
        sources=("DaVinci Resolve colorist tradition", "Sean Archer"),
        what_it_does=(
            "Separately controls color in shadows (lift), midtones "
            "(gamma), and highlights (gain). The professional alternative "
            "to global hue shifts — color and contrast precisely placed."
        ),
        when_to_use=(
            "Polished commercial work where you want the highlights to "
            "feel one way (warm, glamorous) and the shadows another "
            "(deep, cool, moody)."
        ),
        ai_translation=(
            "color-grade with three-way precision — warm the highlights, "
            "keep midtones neutral and accurate, deepen and cool the "
            "shadows; the look should feel deliberately graded, not "
            "instagram-filter casual"
        ),
        style_affinities=("Cinematic", "Editorial"),
        issue_keywords=("color cast", "white balance", "uneven color"),
        scenarios=("all",),
    ),
    EditTechnique(
        name="Film emulation — Kodak Portra 400 palette",
        sources=("Kodak Portra 400 film stock", "VSCO/Mastin film LUTs"),
        what_it_does=(
            "Slightly warm, slightly pink-magenta skin tones; lifted "
            "blacks (never pure black); soft contrast curve; gentle "
            "highlight rolloff. The 'wedding photography' look of the "
            "last decade."
        ),
        when_to_use=(
            "When you want skin tones to feel flattering and timeless "
            "rather than punchy. Especially good for outdoor and natural-"
            "light portraits."
        ),
        ai_translation=(
            "render in 1990s-2000s Kodak Portra 400 film palette — warm "
            "skin tones with subtle pink-magenta cast, lifted blacks "
            "(never true black), soft contrast curve, gentle highlight "
            "rolloff, fine film grain"
        ),
        style_affinities=("Film (Portra 400)",),
        issue_keywords=("cool", "digital", "harsh"),
        scenarios=("portrait", "group", "sunset", "pets"),
    ),
    EditTechnique(
        name="Bleach-bypass / desaturated contrast",
        sources=("Cinematic war/grit films", "DaVinci Resolve grading"),
        what_it_does=(
            "Desaturates the image while boosting contrast. The look of "
            "Saving Private Ryan, Children of Men. Reduced color, brutal "
            "tonality."
        ),
        when_to_use=(
            "Gritty editorial, journalistic, or war-aesthetic shots. "
            "Use sparingly — overuse reads as 'instagram filter'."
        ),
        ai_translation=(
            "bleach-bypass grade — desaturate colors by ~40%, boost "
            "contrast aggressively, deepen shadows, gritty journalistic "
            "look reminiscent of Saving Private Ryan"
        ),
        style_affinities=("Cinematic",),
        issue_keywords=("flat", "tame", "boring"),
        scenarios=("action", "lowlight", "architecture"),
    ),
    # ── B&W conversion ──────────────────────────────────────────────────────
    EditTechnique(
        name="Channel mixer B&W (Ansel Adams zone control)",
        sources=("Ansel Adams (filter-based zone control)", "Channel Mixer in PS"),
        what_it_does=(
            "Converts to B&W by mixing red/green/blue channel luminance "
            "rather than a single desaturate. Lets you control how "
            "specific colors translate to grayscale — e.g. boost red for "
            "moody skies, drop blue for darker eyes."
        ),
        when_to_use=(
            "Any time the user picks B&W. The default 'desaturate' is "
            "amateur; channel-mixer conversion is the professional move."
        ),
        ai_translation=(
            "convert to B&W via channel-mixer luminance control — boost "
            "red luminance for warm skin tones rendered light, drop blue "
            "for deeper skies and shadows; deep true blacks, controlled "
            "highlight detail; classical Ansel-Adams-style tonal control"
        ),
        style_affinities=("B&W",),
        scenarios=("all",),
    ),
    # ── Sharpening + texture ────────────────────────────────────────────────
    EditTechnique(
        name="High-pass sharpening",
        sources=("Standard Photoshop technique", "Aaron Nace tutorials"),
        what_it_does=(
            "Sharpens edge transitions without amplifying noise or "
            "creating halos. The professional alternative to Unsharp "
            "Mask or smart sharpen."
        ),
        when_to_use=(
            "Output sharpening before export — the final pass for any "
            "edited image. Especially important for skin, eyes, and "
            "edges on architectural lines."
        ),
        ai_translation=(
            "apply high-pass output sharpening — crisp edges and fine "
            "detail without halos or amplified noise"
        ),
        style_affinities=("Editorial", "Cinematic", "Natural", "B&W"),
        issue_keywords=("soft", "blurry", "lacks detail"),
        scenarios=("all",),
    ),
    EditTechnique(
        name="Freaky Details (Calvin Hollywood)",
        sources=("Calvin Hollywood",),
        what_it_does=(
            "A hyperreal local-contrast boost that makes the image feel "
            "halfway between photo and illustration. Edges pop, micro-"
            "contrast multiplies. Distinctive German fashion/portrait "
            "aesthetic of the 2010s."
        ),
        when_to_use=(
            "When the user picks Cinematic AND wants visible edge — bold "
            "men's editorial, dramatic action portraits, sports portraits."
        ),
        ai_translation=(
            "apply 'Freaky Details'-style hyperreal local contrast — "
            "boost micro-contrast across textures (skin, fabric, hair) "
            "so edges feel painted and details exaggerated, somewhere "
            "between photo and illustration"
        ),
        style_affinities=("Cinematic",),
        scenarios=("portrait", "action"),
    ),
    EditTechnique(
        name="Orton Effect (dreamy soft + sharp)",
        sources=("Michael Orton",),
        what_it_does=(
            "Sandwiches a sharp version with a blurred-and-brightened "
            "version of the same image, producing an ethereal glow while "
            "keeping detail crisp. The 'fairy-tale forest' look."
        ),
        when_to_use=(
            "Landscape, golden hour, wedding, or any dreamy/romantic "
            "aesthetic. Especially good when combined with backlight."
        ),
        ai_translation=(
            "apply the Orton Effect — overlay a softly blurred, "
            "brightened version on the sharp base for an ethereal glow "
            "around highlights while keeping fine detail crisp"
        ),
        style_affinities=("Film (Portra 400)", "Cinematic"),
        issue_keywords=("dreamy", "soft", "romantic", "glow"),
        scenarios=("portrait", "sunset", "pets"),
    ),
    # ── Local + global tone control ─────────────────────────────────────────
    EditTechnique(
        name="Highlight + Shadow recovery (HDR-style)",
        sources=("Lightroom/Camera Raw HDR sliders", "Joel Grimes HDR portraits"),
        what_it_does=(
            "Recovers detail in blown-out highlights and crushed shadows "
            "without producing the 'overcooked HDR' look. Pulls back "
            "highlights ~30-50%, lifts shadows ~20-40%, never to extreme."
        ),
        when_to_use=(
            "High dynamic range scenes — sunset with foreground, indoor-"
            "with-window, harsh midday sun on faces."
        ),
        ai_translation=(
            "recover dynamic range — pull back blown highlights to show "
            "detail in bright areas, lift the deepest shadows to reveal "
            "form, but keep both ends from looking flat or 'overcooked-HDR'"
        ),
        style_affinities=("Natural", "Editorial", "Cinematic"),
        issue_keywords=("blown", "crushed", "harsh shadow", "highlight"),
        scenarios=("sunset", "architecture", "portrait", "group"),
    ),
    EditTechnique(
        name="S-curve contrast",
        sources=("Curves panel — universal photo retouching"),
        what_it_does=(
            "A gentle S-shape applied to the tone curve: dark zones get "
            "darker, light zones get brighter, midtones stay anchored. "
            "Adds 'snap' without the heavy-handedness of slamming the "
            "contrast slider."
        ),
        when_to_use=(
            "Any flat-looking image. The first move on most pro grades."
        ),
        ai_translation=(
            "apply a gentle S-curve to the tonal range — slight contrast "
            "boost with deeper shadows and brighter highlights, midtones "
            "anchored; adds snap without crushing detail"
        ),
        style_affinities=("Editorial", "Cinematic", "B&W"),
        issue_keywords=("flat", "muddy", "low contrast"),
        scenarios=("all",),
    ),
    EditTechnique(
        name="Vignette / corner burn",
        sources=("Universal portrait retouching", "Glyn Dewis grading tutorials"),
        what_it_does=(
            "Darkens the corners ~10-20% to draw the eye toward the "
            "subject in the center. A subtle move — when it's obvious "
            "it's too much."
        ),
        when_to_use=(
            "Almost any portrait or product shot. Skip on architecture "
            "and group photos where edges carry information."
        ),
        ai_translation=(
            "add a subtle dark vignette — corners ~15% darker than "
            "center to guide the eye toward the subject, never so heavy "
            "the corners read as black"
        ),
        style_affinities=("Editorial", "Cinematic", "Film (Portra 400)"),
        issue_keywords=("busy edge", "eye wanders", "no anchor"),
        scenarios=("portrait", "pets", "food"),
    ),
    # ── Background work ─────────────────────────────────────────────────────
    EditTechnique(
        name="Background blur (f/1.8 bokeh simulation)",
        sources=("Optical bokeh in fast prime lenses", "Lightroom/PS lens-blur filter"),
        what_it_does=(
            "Simulates the soft, creamy out-of-focus background of an "
            "f/1.4-f/2.0 prime lens. Separates subject from environment "
            "and signals 'shot with expensive glass'."
        ),
        when_to_use=(
            "When the background is busy or doesn't add information. "
            "Especially valuable for portrait, food, product, pet shots."
        ),
        ai_translation=(
            "render the background with creamy f/1.8 bokeh — soft, "
            "out-of-focus blur with subtle highlight orbs, subject "
            "tack-sharp against the smooth background"
        ),
        style_affinities=("Editorial", "Cinematic", "Natural"),
        issue_keywords=("busy", "cluttered background", "competes", "distracting"),
        scenarios=("portrait", "food", "pets", "action"),
    ),
    EditTechnique(
        name="Composite-style shadow retention (Joel Grimes)",
        sources=("Joel Grimes",),
        what_it_does=(
            "When swapping a background, retain the subject's original "
            "cast shadow — the seam between subject and new background "
            "is what makes composites look fake. Joel Grimes's trademark."
        ),
        when_to_use=(
            "Any background replacement edit. Without this it reads as "
            "a cutout."
        ),
        ai_translation=(
            "if background changes, retain the subject's original cast "
            "shadow and match light direction precisely — no cutout-on-"
            "background look; Joel-Grimes-style seamless composite"
        ),
        style_affinities=("Editorial", "Cinematic"),
        issue_keywords=("background", "swap", "composite"),
        scenarios=("portrait", "group", "action"),
    ),
    # ── Skin tone correction ────────────────────────────────────────────────
    # ── Macro / depth-of-field ──────────────────────────────────────────────
    EditTechnique(
        name="Focus stacking simulation",
        sources=("Don Komarechka", "Levon Biss", "Helicon Focus tradition"),
        what_it_does=(
            "Mimics a focus-stacked macro: front-to-back sharpness across "
            "the subject while the background falls off into smooth bokeh. "
            "Real focus stacks blend dozens of frames; the prompt-only "
            "shortcut asks the model to render the subject as if it were "
            "the composite of 50+ alignment-blended frames."
        ),
        when_to_use=(
            "Macro work, jewelry product shots, anything where the subject "
            "has depth (insect, flower, watch) but the photographer wants "
            "every detail sharp without losing background separation."
        ),
        ai_translation=(
            "render with focus-stacked macro sharpness — every detail on "
            "the subject in tack-sharp focus from front to back as if "
            "composited from 50+ aligned frames, while the background "
            "remains creamy out-of-focus bokeh; preserve the appearance "
            "of natural depth, not flat all-in-focus rendering"
        ),
        style_affinities=("Natural", "Editorial"),
        issue_keywords=(
            "shallow",
            "depth of field",
            "front softness",
            "petals lost",
            "wings soft",
            "DOF",
        ),
        scenarios=("macro", "food"),
    ),
    EditTechnique(
        name="Skin tone correction (targeted hue/saturation)",
        sources=("Lightroom HSL panel", "Pratik Naik beauty retouching"),
        what_it_does=(
            "Selective adjustment on the orange/red hue range to fix "
            "sickly green or magenta casts on skin. Not the same as "
            "global white balance — surgically targeted at the skin-tone "
            "hue band."
        ),
        when_to_use=(
            "Mixed lighting situations (fluorescent + tungsten + window), "
            "or anywhere skin reads off-color while the background looks "
            "correct."
        ),
        ai_translation=(
            "correct skin tones via targeted HSL on the orange/red hue "
            "range — pull skin toward natural warm peach, remove any "
            "green or magenta cast; background color stays unchanged"
        ),
        style_affinities=("Natural", "Editorial", "Cinematic"),
        issue_keywords=("skin", "cool", "sick", "green", "magenta", "uneven tone"),
        scenarios=("portrait", "group", "pets"),
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# Selectors
# ─────────────────────────────────────────────────────────────────────────────


_MAX_TECHNIQUES_PER_PROMPT = 4
"""Hard cap on techniques embedded in any single prompt — keeps the model
focused. More than 4 named techniques and the AI starts ignoring some.
"""


def techniques_for(
    *,
    style: str,
    focus: str,
    scenario: str,
    issues: tuple[str, ...] = (),
) -> tuple[EditTechnique, ...]:
    """Pick the most relevant techniques given the user's choices + issues.

    Selection order: style affinity is the strongest signal, then issues,
    then scenario. Hard-capped at MAX_TECHNIQUES_PER_PROMPT for focus.
    """
    style_l = style.strip()
    scenario_l = scenario.strip().lower()
    issues_blob = " ".join(issues).lower()

    scored: list[tuple[int, EditTechnique]] = []
    for tech in TECHNIQUES:
        score = 0

        # Strong: style match
        if any(s == style_l for s in tech.style_affinities):
            score += 5

        # Strong: scenario match
        if "all" in tech.scenarios or scenario_l in tech.scenarios:
            score += 2

        # Medium: issue keywords detected
        if tech.issue_keywords and issues_blob:
            for kw in tech.issue_keywords:
                if kw in issues_blob:
                    score += 3
                    break

        # Focus alignment (lightweight — handful of overlaps)
        focus_low = focus.lower()
        if "sharp" in focus_low and tech.name in (
            "High-pass sharpening",
            "Eye enhancement (selective brightening + sharpening)",
            "Background blur (f/1.8 bokeh simulation)",
        ):
            score += 1
        if "dream" in focus_low and tech.name in ("Orton Effect (dreamy soft + sharp)",):
            score += 3

        if score > 0:
            scored.append((score, tech))

    # Sort by score, stable, descending
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return tuple(t for _, t in scored[:_MAX_TECHNIQUES_PER_PROMPT])


def format_techniques_for_prompt(techs: tuple[EditTechnique, ...]) -> str:
    """Format selected techniques as a tight reference for the AI prompt-writer.

    Output is the natural-language translation (ai_translation field) prefixed
    by the technique name + source. Compact: one block per technique.
    """
    if not techs:
        return ""
    lines = []
    for t in techs:
        sources_short = ", ".join(t.sources[:2])
        lines.append(
            f"- {t.name} (from {sources_short}):\n    {t.ai_translation}"
        )
    return "\n".join(lines)
