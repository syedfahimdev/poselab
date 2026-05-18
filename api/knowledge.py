"""Photographic knowledge base.

A curated, structured set of principles per photo type, attributed to named
photographers. Used to ground the AI critique in real photographic tradition
instead of generic "good photo" advice.

Sources (researched May 2026):
  - Portrait: Annie Leibovitz (MasterClass, Russell Collection, DIY Photography),
    Richard Avedon, Peter Lindbergh, Yousuf Karsh, Mario Testino
  - Food: Andrew Scrivani (NYT, CreativeLive), David Loftus (Jamie Oliver),
    Penny De Los Santos, Beth Galton
  - Golden hour: Ansel Adams (Zone System), Galen Rowell, Sebastião Salgado
  - Low light: Saul Leiter (color, blur, taxi-window technique),
    Daido Moriyama (grain), Trent Parke (high contrast)
  - Group: Slim Aarons ("attractive people, attractive places"),
    Steve McCurry (unguarded moment)
  - Architecture: Julius Shulman (4x5 view, mid-century Case Study),
    Iwan Baan (documentary, human-in-frame), Hélène Binet (light as subject)
  - Action: Walter Iooss (sports), Henri Cartier-Bresson ("decisive moment",
    1/125 manual)
  - Pets/Kids: Sally Mann (Immediate Family, 8x10, monochrome),
    William Wegman (Weimaraners, eye-level)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


Scenario = Literal[
    "portrait",
    "group",
    "sunset",
    "food",
    "lowlight",
    "action",
    "architecture",
    "pets",
    "macro",
    "other",
]


@dataclass(frozen=True)
class Photographer:
    name: str
    why_relevant: str  # one sentence — what this photographer is known for here


@dataclass(frozen=True)
class Principle:
    rule: str  # the actionable principle, one sentence
    why: str  # why this works — the underlying reason
    trace: str  # which photographer(s) this comes from
    violations: tuple[str, ...]  # observable signs that this is being violated


@dataclass(frozen=True)
class ScenarioKB:
    label: str
    lineage: tuple[Photographer, ...]
    principles: tuple[Principle, ...]
    red_flags: tuple[str, ...]  # immediate "amateur" markers
    aesthetic_targets: tuple[str, ...]  # end-state qualities to aim for


# ─────────────────────────────────────────────────────────────────────────────
# PORTRAIT (single person)
# ─────────────────────────────────────────────────────────────────────────────
PORTRAIT = ScenarioKB(
    label="Portrait (single person)",
    lineage=(
        Photographer(
            "Annie Leibovitz",
            "Mixes ambient light with a single small key light placed slightly "
            "behind the subject so light glances across the face, creating "
            "dimension. Big soft sources (Photek Softlighter, Elinchrom).",
        ),
        Photographer(
            "Richard Avedon",
            "Stark white seamless backgrounds; direct eye contact; isolated "
            "subjects; psychological intensity through stripped-down framing.",
        ),
        Photographer(
            "Peter Lindbergh",
            "Black-and-white natural light; no makeup; captures the person, "
            "not the surface. Honest, unretouched, character-revealing.",
        ),
        Photographer(
            "Yousuf Karsh",
            "Dramatic side light and chiaroscuro to reveal character; the "
            "Winston Churchill portrait technique — light defines structure.",
        ),
    ),
    principles=(
        Principle(
            rule="Light skims the face from roughly 45° front-and-above, not directly overhead and not flat-frontal.",
            why="Wraps light around cheekbones, fills under-eye shadows, preserves skin texture without flattening features.",
            trace="Leibovitz, Karsh",
            violations=(
                "harsh shadows under nose/chin (overhead sun)",
                "raccoon eyes / dark sockets from midday sun",
                "flat frontal flash that erases dimension",
                "subject backlit so face is in shadow",
            ),
        ),
        Principle(
            rule="The nearest eye is sharp and shows a catchlight.",
            why="Eyes carry the portrait's emotional truth. Catchlights signal life — without them eyes look dead even when technically sharp.",
            trace="Avedon, Leibovitz, Lindbergh",
            violations=(
                "eyes out of focus while ears or nose are sharp",
                "no catchlight visible (subject lit only from above/below)",
                "subject looking past camera when intent was direct connection",
            ),
        ),
        Principle(
            rule="Background supports, never competes.",
            why="Either soft blur (f/1.8–2.8 simulation) or a clean seamless. Busy backgrounds steal the viewer's attention from the face.",
            trace="Avedon (seamless), Leibovitz (controlled environment)",
            violations=(
                "tree, pole, or fixture appearing to grow from subject's head",
                "background colors saturated enough to compete with skin tones",
                "merging textures behind subject's outline",
                "high-contrast clutter pulling the eye away from the face",
            ),
        ),
        Principle(
            rule="Hands tell as much as eyes — give them something to do.",
            why="Idle hands look posed and tense. Engaged hands (holding, gesturing, near face) read as natural.",
            trace="Leibovitz, Lindbergh",
            violations=(
                "stiff hands hanging at sides",
                "clenched fists in a casual shot",
                "awkwardly amputated at the wrist by the frame edge",
            ),
        ),
        Principle(
            rule="An 85–105mm focal length flatters faces; wider lenses distort them.",
            why="Telephoto compression makes facial features proportional. Wide-angle close-ups enlarge noses and shrink ears.",
            trace="Classical portrait practice; followed by Leibovitz and Lindbergh both",
            violations=(
                "wide-angle close-up causing facial distortion",
                "shot from below eye level (making nostrils prominent)",
                "shot from too far so subject is small in frame",
            ),
        ),
    ),
    red_flags=(
        "Window or bright sky directly behind subject silhouetting the face",
        "Eyes in shadow OR out of focus",
        "Distracting object intersecting the subject's silhouette",
        "Symmetric frontal pose with arms straight down — reads as a mugshot",
        "Skin tones cool/green from uncorrected fluorescent or tungsten",
    ),
    aesthetic_targets=(
        "Visible catchlight in both eyes",
        "Plane of focus on the nearest eye, gentle falloff elsewhere",
        "Skin texture preserved — not smoothed into plastic",
        "Background recedes into a supporting role",
        "Pose feels found rather than posed",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# GROUP (3+ people)
# ─────────────────────────────────────────────────────────────────────────────
GROUP = ScenarioKB(
    label="Group photo (3+ people)",
    lineage=(
        Photographer(
            "Slim Aarons",
            "Environmental group portraits of high society — 'attractive "
            "people doing attractive things in attractive places.' No stylists, "
            "no elaborate lighting; the setting does the work.",
        ),
        Photographer(
            "Steve McCurry",
            "Looks for the unguarded moment within the group; the essential "
            "soul of each person while still composing the whole.",
        ),
    ),
    principles=(
        Principle(
            rule="Stack heights — don't line everyone up at the same eye level.",
            why="A flat row reads as a yearbook. Varying heights creates depth and signals relationship between people.",
            trace="Aarons; standard environmental group practice",
            violations=(
                "everyone standing in a straight line at identical height",
                "back row hidden behind front row's heads",
                "group occupying a thin horizontal slice of the frame",
            ),
        ),
        Principle(
            rule="35mm full-frame (≈ 24mm crop) is the group lens — wide enough for 6 people without distortion at the edges.",
            why="Wider distorts faces near the corners. Tighter (50mm+) forces you so far back that subjects look small.",
            trace="Aarons typically shot 35mm-equivalent; portrait/environmental tradition",
            violations=(
                "wide-angle stretching at corner faces",
                "subjects pushed to frame edges where distortion is highest",
                "shooting from too far so faces are unrecognizable",
            ),
        ),
        Principle(
            rule="Focus on the eyes of the front row; let depth-of-field carry the back.",
            why="The front row is the focus plane. Stopping down to f/5.6–8 keeps the back row acceptably sharp without sacrificing brightness.",
            trace="Standard group portrait practice",
            violations=(
                "shallow depth-of-field smearing the back row to mush",
                "focus locked on background instead of people",
            ),
        ),
        Principle(
            rule="Burst at least 5 frames — one person always blinks.",
            why="Probabilistically, in any group of 5+, the chance of all eyes open in a single frame drops below 50%.",
            trace="Practical wedding/group portrait wisdom; reinforced by McCurry's unguarded-moment philosophy",
            violations=(
                "one person mid-blink in the chosen shot",
                "one person looking elsewhere while others look at camera",
                "tense posed expressions throughout",
            ),
        ),
    ),
    red_flags=(
        "Symmetrical lineup with rigid spacing — group looks like a chorus",
        "One person mid-blink",
        "Chopped heads at the top of frame or limbs at the sides",
        "Mixed eye-direction (some at camera, others elsewhere)",
        "Subject in the back row hidden behind subject in the front",
    ),
    aesthetic_targets=(
        "Stacked heights with clear depth — front, middle, back",
        "All eyes either at the camera together OR engaged with each other together",
        "Environmental setting that says something about who they are",
        "Headroom and side margin generous enough to feel relaxed",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# SUNSET / GOLDEN HOUR
# ─────────────────────────────────────────────────────────────────────────────
SUNSET = ScenarioKB(
    label="Sunset / golden hour",
    lineage=(
        Photographer(
            "Ansel Adams",
            "Zone System: 'Expose for the shadows; develop for the highlights.' "
            "11 tonal zones, zone 5 = middle gray. Translated to digital: meter "
            "for the highlights you want preserved.",
        ),
        Photographer(
            "Galen Rowell",
            "Warm light at sunrise/sunset as the subject itself; dramatic "
            "landscape light, often with a small foreground element for scale.",
        ),
        Photographer(
            "Sebastião Salgado",
            "Shadow detail preserved even in high-contrast scenes; humans-in-"
            "landscape giving scale and emotional context.",
        ),
    ),
    principles=(
        Principle(
            rule="Underexpose by 0.5–1 stop to keep the sky saturated.",
            why="Auto exposure averages bright sky and dark foreground, brightening sky to grey. Underexposing preserves saturation and contrast — the colors you actually wanted.",
            trace="Adams (expose for highlights you want); standard golden-hour digital practice",
            violations=(
                "washed-out pale sky where you saw vivid orange/pink",
                "blown-out highlights with no color information",
                "subject correctly exposed but sky flattened",
            ),
        ),
        Principle(
            rule="Silhouette > frontally-lit subject when the sky is the show.",
            why="Trying to light the subject AND expose for the sky usually produces both flat and washed-out. A clean silhouette against vivid sky is dramatic and honest to the light.",
            trace="Galen Rowell aesthetic; Adams contrast control",
            violations=(
                "subject lit by harsh side-flash against a beautiful sky",
                "HDR-merged exposure that looks fake",
            ),
        ),
        Principle(
            rule="Shoot 20 minutes BEFORE and 20 minutes AFTER peak sunset.",
            why="The light keeps changing after the sun is gone — civil twilight and 'blue hour' often produce better images than peak. Most amateurs leave too early.",
            trace="Practical golden-hour wisdom across landscape photographers",
            violations=(
                "shot timed for peak sun only — flat magenta sky, no afterglow",
                "left before the afterglow developed",
            ),
        ),
        Principle(
            rule="Include a foreground element for depth and scale.",
            why="Sky alone is a wallpaper. A silhouetted figure, tree, or rock anchors the frame and gives the viewer a sense of size.",
            trace="Rowell, Adams composition; Salgado human-in-landscape",
            violations=(
                "sky-only composition with nothing to anchor it",
                "horizon dead-centered with no leading element",
            ),
        ),
    ),
    red_flags=(
        "Pale washed-out sky (auto exposure overcorrected)",
        "Subject in front of sun, lit by harsh flash, sky blown out",
        "Horizon dead-centered with no element of interest",
        "Composition relying on color alone — no shape, no silhouette",
    ),
    aesthetic_targets=(
        "Saturated, deep sky color (oranges, pinks, magenta) preserved",
        "Silhouette or rim-lit subject as anchor",
        "Foreground/midground/background depth",
        "Horizon either on a third or angled, never dead-centered",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# FOOD
# ─────────────────────────────────────────────────────────────────────────────
FOOD = ScenarioKB(
    label="Food / flat lay",
    lineage=(
        Photographer(
            "Andrew Scrivani",
            "NYT food photographer. Three working angles: iconic tabletop, "
            "interactive diner's view, artistic overhead. Backlighting and "
            "sidelighting as the two main techniques — mimics window light.",
        ),
        Photographer(
            "David Loftus",
            "Jamie Oliver's cookbook photographer. Natural window light on "
            "location, spontaneous composition; subtle sunlight pulled through "
            "fabric to bring out food's textures and colors.",
        ),
        Photographer(
            "Penny De Los Santos",
            "Storytelling around food — hands, process, location context. "
            "Food as anchor, not the only subject.",
        ),
    ),
    principles=(
        Principle(
            rule="Pick the angle the dish wants: top-down for flat dishes (pizza, bowls); 45° three-quarter for dishes with depth (burgers, steak); eye-level for stacks and glasses.",
            why="Wrong angle hides the hero element. Top-down on a steak hides the height; 45° on a pizza loses the geometry.",
            trace="Scrivani's three angles framework",
            violations=(
                "top-down on a dish with visual height/structure",
                "45° angle on a flat bowl (hides the contents)",
                "any food shot from 5 feet directly above eye level (a tourist angle)",
            ),
        ),
        Principle(
            rule="Backlight or sidelight from a window; never overhead direct sunlight or restaurant tungsten without a filter.",
            why="Backlight makes surfaces glow and steam catch the light. Overhead tungsten in restaurants makes food look orange and sick.",
            trace="Scrivani, Loftus — both heavily natural-light-based",
            violations=(
                "harsh restaurant overhead casting heavy shadow on the plate",
                "warm-orange tungsten cast on white plates",
                "phone flash bouncing off plates",
            ),
        ),
        Principle(
            rule="Garnishes face the camera; cutlery laid askew, not parallel.",
            why="Garnish placement is the only intentional thing the photographer controls AFTER the chef plates. Askew cutlery makes the scene feel found, not staged.",
            trace="Scrivani's styling guidance; standard food editorial",
            violations=(
                "garnish hidden under the rim or facing away",
                "fork-and-knife laid in perfect parallel lines (looks like a stock photo)",
                "uniform empty space — no human trace",
            ),
        ),
        Principle(
            rule="The 'hero' element gets one clean line of light or one negative-space halo around it.",
            why="The viewer's eye needs a destination. A single highlight on the cheese pull or the egg yolk tells the eye where to land.",
            trace="Scrivani: 'choose an ideal hero product'",
            violations=(
                "everything in the frame equally lit (no hierarchy)",
                "main dish smaller in frame than supporting elements",
            ),
        ),
    ),
    red_flags=(
        "Orange/yellow color cast from restaurant tungsten",
        "Phone-flash glare bouncing off the plate",
        "Top-down angle on dishes with vertical structure",
        "Steam absent on hot food (shot too late)",
        "Empty background with no context or props",
    ),
    aesthetic_targets=(
        "One clear hero element, eye lands there first",
        "Natural-looking light direction (window backlight is the cliché for a reason)",
        "Garnishes and texture visible, not flattened",
        "A trace of human presence — hand, napkin off-frame, askew utensil",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# LOW LIGHT / NIGHT
# ─────────────────────────────────────────────────────────────────────────────
LOWLIGHT = ScenarioKB(
    label="Low light / night",
    lineage=(
        Photographer(
            "Saul Leiter",
            "Pioneer of color street photography. Reflections, shadows, "
            "blurred subjects shot through windows. Lower shutter speed from "
            "moving vehicles — color and atmosphere over sharpness.",
        ),
        Photographer(
            "Daido Moriyama",
            "Embraces grain as content, not noise. Harsh contrast, blown "
            "highlights treated as visual texture rather than mistakes.",
        ),
        Photographer(
            "Trent Parke",
            "High-contrast urban darkness with single shafts of light. "
            "Black areas are the subject, not absence.",
        ),
    ),
    principles=(
        Principle(
            rule="Don't fight grain — embrace it as texture.",
            why="ISO 3200–6400 on a modern sensor looks like film. Trying to keep noise out at the cost of motion blur or underexposure usually ruins more shots than it saves.",
            trace="Moriyama (grain as content); modern sensor reality",
            violations=(
                "underexposed to keep ISO down, then crushed to black in post",
                "noise reduction smearing fine detail into plastic",
            ),
        ),
        Principle(
            rule="Find one bright light source and expose for it.",
            why="A neon sign, a streetlamp, a doorway. The single-source scene reads cleanly. Trying to balance multiple competing lights flattens everything.",
            trace="Trent Parke; Leiter's framed shafts",
            violations=(
                "scene lit by 3+ competing color temperatures (yellow tungsten + green fluorescent + blue LED) with no dominant",
                "subject in the dim spot between two brighter ones",
            ),
        ),
        Principle(
            rule="Brace against something solid for sub-second exposures.",
            why="1/(focal length) is the bare-minimum handheld shutter. Below that, a wall, a railing, a parked car, or just braced elbows on a table buy you 2-4 extra stops.",
            trace="Standard low-light practice across all listed photographers",
            violations=(
                "motion blur on the subject at shutter speeds well above 1/60",
                "camera shake visible in highlights (smeared streetlamps)",
            ),
        ),
        Principle(
            rule="Color casts are signal, not noise — keep them.",
            why="Tungsten warm, sodium-vapor orange, mercury blue-green — these tell the viewer where they are. Auto-white-balance corrected to 'neutral' kills the mood.",
            trace="Leiter (color-as-mood); urban night tradition",
            violations=(
                "all light corrected to white in post — loses location feel",
                "subject's skin tones unnaturally normal under heavy tungsten",
            ),
        ),
    ),
    red_flags=(
        "Frozen motion blur from sub-1/60 handheld",
        "Noise reduction wiping out fine detail",
        "Subject lit by direct phone flash with everything else black",
        "Aggressive auto-white-balance neutralizing the actual scene color",
    ),
    aesthetic_targets=(
        "Visible grain treated as texture",
        "One clear dominant light source in the frame",
        "Color casts preserved — sodium oranges, neon magentas",
        "Subject placed at intersection of light and shadow, not flatly lit",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# ACTION / MOVEMENT
# ─────────────────────────────────────────────────────────────────────────────
ACTION = ScenarioKB(
    label="Action / movement",
    lineage=(
        Photographer(
            "Walter Iooss Jr.",
            "Sports Illustrated. 'The decisive moment is when something "
            "magical happens.' Anticipate where peak action will be, not "
            "where it is now.",
        ),
        Photographer(
            "Henri Cartier-Bresson",
            "Coined 'the decisive moment' — the fraction of a second when "
            "elements in motion are in balance. Worked at 1/125 manual, no "
            "autofocus; relied on geometry and anticipation.",
        ),
    ),
    principles=(
        Principle(
            rule="1/500+ to freeze; 1/30 to convey speed via background pan blur.",
            why="Half-speeds (1/125 to 1/250) freeze the subject's body but blur their hands/feet — usually the worst of both worlds.",
            trace="Sports photography practice (Iooss); cinematic motion convention",
            violations=(
                "1/125 on running subject — body sharp, hands smeared",
                "1/1000 on a subject that needed to feel fast — frozen and lifeless",
            ),
        ),
        Principle(
            rule="Pre-focus where the action will arrive, not where it is.",
            why="By the time autofocus locks, the moment is gone. Pick a spot the subject will cross and shoot when they enter it.",
            trace="Iooss; Cartier-Bresson (manual focus by design)",
            violations=(
                "subject blurry while background is sharp — focus hunted and lost",
                "subject offset from where the photographer aimed",
            ),
        ),
        Principle(
            rule="Burst the moment BEFORE you think to shoot.",
            why="The climax frame is usually one or two before the obvious one — the wind-up is often more expressive than the impact.",
            trace="Iooss's 'something magical happens'; Cartier-Bresson's geometric balance",
            violations=(
                "shot timed for the 'obvious' peak — sometimes too late",
                "only one frame captured (no choice in post)",
            ),
        ),
        Principle(
            rule="Faces matter more than flying objects.",
            why="An expression of effort, joy, or pain carries the moment. A perfectly-sharp ball with no face is just a stock photo.",
            trace="Iooss's portrait-sensibility approach to sports",
            violations=(
                "subject's face turned away or in shadow",
                "centered on the equipment (ball, racket) rather than the human",
            ),
        ),
    ),
    red_flags=(
        "Mid-shutter speeds (1/125–1/250) producing inconsistent partial blur",
        "Focus hunted and locked on background instead of subject",
        "Centered, static composition for a dynamic moment",
        "Face turned away or in shadow",
    ),
    aesthetic_targets=(
        "Clear visual choice — frozen sharp OR intentionally blurred",
        "Expression visible on the subject's face",
        "Composition with diagonal energy, not flat horizontal",
        "Background tells you what's happening (court, field, crowd)",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# ARCHITECTURE / INTERIOR
# ─────────────────────────────────────────────────────────────────────────────
ARCHITECTURE = ScenarioKB(
    label="Architecture / interior",
    lineage=(
        Photographer(
            "Julius Shulman",
            "Brought modernism mainstream via Case Study houses. Large-format "
            "4x5 view camera; placed furniture and people to make houses look "
            "livable; balanced bold exterior with chic comfortable interior.",
        ),
        Photographer(
            "Iwan Baan",
            "Documentary approach — embeds buildings in their context with "
            "people interacting. Challenges the tradition of architecture "
            "shown empty and pristine.",
        ),
        Photographer(
            "Hélène Binet",
            "Light as the subject. Abstract patterns of shadow and surface; "
            "the building becomes the texture, not the diagram.",
        ),
    ),
    principles=(
        Principle(
            rule="Vertical lines must be vertical.",
            why="Tilted verticals (from leaning the camera back to fit a tall building) read as 'amateur' before any other element registers. Either step back, use a wider lens at the same level, or correct in post.",
            trace="Shulman (view-camera tilts); standard architectural practice",
            violations=(
                "building leaning inward at the top (keystone distortion)",
                "horizon line tilted",
                "windows trapezoidal instead of rectangular",
            ),
        ),
        Principle(
            rule="Include a human (or human-scale object) for scale and life.",
            why="Empty architecture is a diagram. A single person, a coat, a half-drunk coffee tells the viewer this place is lived in.",
            trace="Baan (documentary); Shulman (placed models to make houses livable)",
            violations=(
                "perfectly empty interior shot looking like a real-estate listing",
                "no sense of scale — building could be 10 feet or 100",
            ),
        ),
        Principle(
            rule="The best architectural light is early morning or late afternoon — never noon overhead.",
            why="Low-angle sun reveals texture, casts long shadows that define form, warms the materials. Noon flattens everything.",
            trace="Shulman's working schedule; Binet's shadow-as-subject practice",
            violations=(
                "noon shoot with verticals lit flat and no texture",
                "harsh overhead shadows obliterating facade detail",
            ),
        ),
        Principle(
            rule="The money shot is usually a three-quarter angle, not flat frontal.",
            why="Flat frontal turns a building into a diagram. A 30–45° angle shows two facades, gives depth, and reveals how the volumes meet.",
            trace="Shulman's Stahl House angle; standard architectural composition",
            violations=(
                "perfectly head-on flat elevation (looks like an architect's drawing)",
                "subject is the building's least interesting side",
            ),
        ),
    ),
    red_flags=(
        "Tilted verticals (keystone distortion)",
        "Empty interior with no human trace",
        "Noon-overhead lighting flattening all texture",
        "Flat frontal angle erasing depth",
        "Wide-angle stretching at the corners with no central anchor",
    ),
    aesthetic_targets=(
        "Verticals rigorously vertical (or intentionally exaggerated, never accidentally tilted)",
        "Low-angle warm light defining texture and edge",
        "Human scale visible — a person, a chair occupied",
        "Composition revealing how volumes meet (3/4 angle)",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# PETS / KIDS
# ─────────────────────────────────────────────────────────────────────────────
PETS = ScenarioKB(
    label="Pets / kids",
    lineage=(
        Photographer(
            "Sally Mann",
            "Immediate Family series, large-format 8x10 monochrome. Intimacy "
            "through patience — mentally sketched each frame, discarded "
            "dozens before extensively laboring in the darkroom.",
        ),
        Photographer(
            "William Wegman",
            "Weimaraner portraits at eye level — anthropomorphic deadpan. "
            "Made dogs the subject, not the prop.",
        ),
    ),
    principles=(
        Principle(
            rule="Get down to their eye level.",
            why="Shooting down at pets and kids makes them look small and inferior. Eye-level makes them protagonists. This is the single biggest difference between snapshot and portrait.",
            trace="Wegman (dogs at eye level); Mann (kid's-world perspective)",
            violations=(
                "shot from standing height down at the subject",
                "subject occupying the bottom third with empty space above",
                "subject's eyes pointing up away from the camera",
            ),
        ),
        Principle(
            rule="The eyes — and only the eyes — are where focus must land.",
            why="Pets and kids move; you'll lose body sharpness sometimes. But out-of-focus eyes are unrecoverable. Modern cameras have animal-eye and face AF for exactly this reason.",
            trace="Practical pet portrait; reinforced by Mann's monochrome-portrait sharpness",
            violations=(
                "tail, paw, or ear sharp while eyes are soft",
                "back-focused — sharp on background past the subject",
            ),
        ),
        Principle(
            rule="Burst is mandatory — one good frame in ten.",
            why="Pets and kids do not pose. Their best expressions last 1/4 second and are essentially unpredictable. Shoot 15 frames and pick.",
            trace="Practical; Mann discarded 'dozens' before the keeper",
            violations=(
                "single frame attempted, missed the moment",
                "asking the kid to 'smile' producing a forced grimace",
            ),
        ),
        Principle(
            rule="Use a sound or off-camera toy to get an alert head-tilt and ears up — but only ONCE per session.",
            why="The first squeak gets ears forward and an alert tilt. The second produces no reaction. Use it for the keeper frame, not as a continuous prompt.",
            trace="Animal-portraiture practice; Wegman's setup-as-trigger",
            violations=(
                "repeatedly trying to get attention until pet/kid is bored or annoyed",
                "subject's expression dull because the prompt was over-used",
            ),
        ),
    ),
    red_flags=(
        "Shot from human standing height looking down",
        "Out-of-focus eyes",
        "Forced posed expression (kids especially — 'say cheese')",
        "Subject occupying < 30% of frame with no environmental context",
        "Motion blur on the body (shutter too slow)",
    ),
    aesthetic_targets=(
        "Eye-level perspective, camera on the floor if needed",
        "Sharp on the nearest eye, with catchlight",
        "Found expression — a natural laugh, alert ears, sleeping curl",
        "Either tight enough to feel intimate OR wide enough to show their world",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# MACRO — close-up nature, insects, water droplets, textures
# ─────────────────────────────────────────────────────────────────────────────
MACRO = ScenarioKB(
    label="Macro / close-up",
    lineage=(
        Photographer(
            "Thomas Shahan",
            "Eye-level jumping-spider portraits — radical empathy via getting "
            "the camera's plane below the subject. Vibrant black backgrounds, "
            "frontal flash diffused through small softboxes.",
        ),
        Photographer(
            "Don Komarechka",
            "Snowflake + water-droplet macro through focus stacking and "
            "polarized refraction. 100+ frame stacks aligned and blended.",
        ),
        Photographer(
            "Levon Biss",
            "Microsculpture insect series — 8000+ frames per specimen, "
            "lit zone-by-zone, composited into a 'scientific hyperreal' "
            "aesthetic that shows what you couldn't see in person.",
        ),
        Photographer(
            "Edward Weston",
            "Pepper #30, the cabbage leaf, the nautilus shell — organic "
            "form abstracted into sculpture. Black-and-white, sharp, "
            "front-lit, deliberate composition.",
        ),
        Photographer(
            "Karl Blossfeldt",
            "Early-20th-century botanical close-ups; German precision, "
            "flat backgrounds, plants framed like architectural studies.",
        ),
    ),
    principles=(
        Principle(
            rule="Focus stack — depth of field at 1:1 magnification is 1-2mm; one frame can never carry the whole subject.",
            why="True macro inherently has razor-thin DOF; trying to stop down to f/22 to compensate introduces diffraction blur that's worse than the DOF problem you're solving.",
            trace="Komarechka, Biss — focus stacking is THE macro craft",
            violations=(
                "single-frame macro with only the front 2mm sharp",
                "f/22 used to 'get everything in focus' — diffraction kills detail",
                "subject sharp but petals/wings/legs lost to softness",
            ),
        ),
        Principle(
            rule="Get below or at eye level with the subject — never above.",
            why="Insects, flowers, droplets shot from above look like specimens. Shot from eye level they look like subjects with agency.",
            trace="Thomas Shahan — radical empathy via camera angle",
            violations=(
                "shot looking down at a flower / insect",
                "camera at hand-held human standing-height for ground subjects",
                "no sense the subject and viewer are at the same scale",
            ),
        ),
        Principle(
            rule="One diffused light source close to the subject — not a ring flash, not ambient.",
            why="Ring flash flattens texture (shadowless = featureless). Ambient is usually too dim at f/8+ for macro work. A single small softbox 4-6 inches off the subject gives modeling shadow that reveals form.",
            trace="Levon Biss methodology; macro standard practice",
            violations=(
                "ring-flash-flat lighting with no shadow direction",
                "underexposed natural-light attempt with motion blur from slow shutter",
                "harsh on-camera direct flash blowing out near-side",
            ),
        ),
        Principle(
            rule="Background is black, neutral, or far-defocused — never a competing texture at the same focal plane.",
            why="At 1:1 magnification the background falls off so dramatically that even a meter behind looks like color wash. Use it. A black backdrop or a far-away color gradient makes the subject pop.",
            trace="Shahan (black), Blossfeldt (neutral), Weston (sculpted shadow)",
            violations=(
                "background as in-focus as the subject (no separation)",
                "competing texture at same DOF — grass blades behind the spider",
                "color of background matches subject (camouflage)",
            ),
        ),
        Principle(
            rule="Front-most subject element on a rule-of-thirds anchor; lead with the eyes (insects) or focal point (water droplet).",
            why="Macro is intimate. The eye lands on whatever is sharpest closest to the camera — make sure that's the most meaningful detail (mantis eye, droplet refraction, pistil).",
            trace="Universal composition; especially load-bearing at macro magnification",
            violations=(
                "sharpest point not the most-important part of the subject",
                "subject centered with no compositional reason",
                "frame-edge too close — clipping antennae / petals",
            ),
        ),
    ),
    red_flags=(
        "Single-frame DOF too shallow to carry the subject (no stacking)",
        "Shot from above looking down — specimen-on-a-table angle",
        "Ring-flash flatness — no modeling shadow on the subject",
        "Background contains in-focus distracting elements",
        "Frame edge clips body parts of the subject",
    ),
    aesthetic_targets=(
        "Front-to-back sharpness via focus stacking",
        "Eye-level (or lower) camera angle",
        "Single soft directional light revealing texture",
        "Background recedes to color wash or black",
        "Sharpest point lands on the most meaningful detail",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# OTHER — fallback for things we don't have a tradition for
# ─────────────────────────────────────────────────────────────────────────────
OTHER = ScenarioKB(
    label="Photo (general)",
    lineage=(
        Photographer(
            "Henri Cartier-Bresson",
            "The decisive moment — geometry and timing matter more than gear.",
        ),
        Photographer(
            "Saul Leiter",
            "Color, light, and atmosphere over technical perfection.",
        ),
    ),
    principles=(
        Principle(
            rule="Find one clear subject; everything else supports it.",
            why="Photos with multiple equally-weighted subjects feel cluttered and ambiguous. The eye needs a place to land.",
            trace="Cartier-Bresson geometry; standard composition",
            violations=(
                "no clear visual hierarchy — eye doesn't know where to go",
                "multiple subjects competing for attention",
            ),
        ),
        Principle(
            rule="Edges of the frame matter — clean them up.",
            why="Half-objects at the frame edge pull the eye out of the photo. A clean perimeter holds attention inward.",
            trace="Cartier-Bresson; standard composition",
            violations=(
                "limb / object partially cut off at frame edge",
                "competing subjects at the corners",
            ),
        ),
        Principle(
            rule="Light direction is content. Identify it before composing.",
            why="A photo's mood is determined by where the light comes from. Frontal flat = literal; side = sculptural; back = silhouette/glow.",
            trace="Universal — Leiter, Adams, Cartier-Bresson all start from light",
            violations=(
                "flat frontal lighting with no shadow direction",
                "competing light directions making the scene confusing",
            ),
        ),
    ),
    red_flags=(
        "No clear subject",
        "Cluttered edges with partial objects",
        "Tilted horizon (not intentional)",
        "Subject dead-centered without compositional reason",
    ),
    aesthetic_targets=(
        "Clear hierarchy — one subject, supporting context",
        "Considered light direction",
        "Clean edges",
        "A reason for the composition that the viewer can feel",
    ),
)


# ─────────────────────────────────────────────────────────────────────────────
# Registry
# ─────────────────────────────────────────────────────────────────────────────
KB: dict[Scenario, ScenarioKB] = {
    "portrait": PORTRAIT,
    "group": GROUP,
    "sunset": SUNSET,
    "food": FOOD,
    "lowlight": LOWLIGHT,
    "action": ACTION,
    "architecture": ARCHITECTURE,
    "pets": PETS,
    "macro": MACRO,
    "other": OTHER,
}


# ─────────────────────────────────────────────────────────────────────────────
# Formatting helpers (used by prompts.py)
# ─────────────────────────────────────────────────────────────────────────────


def format_lineage(kb: ScenarioKB) -> str:
    """Compact 'photographer: why' lines for the system prompt."""
    return "\n".join(f"- {p.name}: {p.why_relevant}" for p in kb.lineage)


def format_principles(kb: ScenarioKB) -> str:
    out = []
    for i, p in enumerate(kb.principles, 1):
        signs = "; ".join(p.violations)
        out.append(
            f"{i}. {p.rule}\n"
            f"   why: {p.why}\n"
            f"   tradition: {p.trace}\n"
            f"   signs of violation: {signs}"
        )
    return "\n".join(out)


def format_red_flags(kb: ScenarioKB) -> str:
    return "\n".join(f"- {f}" for f in kb.red_flags)


def format_aesthetic_targets(kb: ScenarioKB) -> str:
    return "\n".join(f"- {t}" for t in kb.aesthetic_targets)


def all_scenarios() -> str:
    """All scenario keys joined for the classifier prompt."""
    return " | ".join(KB.keys())
