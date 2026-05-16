/**
 * Settings Mode — hand-curated cheat sheets.
 *
 * 8 scenarios × 5 device families = 40 cards. All static; zero API cost;
 * works offline. To swap to Supabase later, just port this object into the
 * `settings_cards` table.
 *
 * Authoring rules:
 *  - Phones have FIXED apertures — never tell a phone user to "use f/X".
 *    The `aperture` field on phone cards either describes the simulated
 *    portrait-mode strength or is "fixed".
 *  - DSLR cards get real shutter/aperture/ISO.
 *  - `mode` is the literal camera-app mode the user should tap.
 *  - `tip` is ONE actionable sentence — not generic ("use good light" is bad).
 */

export const SCENARIOS = [
  "portrait",
  "group",
  "sunset",
  "food",
  "lowlight",
  "action",
  "architecture",
  "pets",
] as const;

export type Scenario = (typeof SCENARIOS)[number];

export const DEVICES = [
  "iphone",
  "pixel",
  "samsung",
  "android",
  "dslr",
] as const;

export type Device = (typeof DEVICES)[number];

export type Card = {
  mode: string;
  iso: string;
  shutter: string;
  aperture: string;
  focus: string;
  tip: string;
};

export const SCENARIO_LABELS: Record<Scenario, string> = {
  portrait: "Portrait",
  group: "Group photo",
  sunset: "Sunset / golden hour",
  food: "Food / flat lay",
  lowlight: "Low light / night",
  action: "Action / movement",
  architecture: "Architecture / interior",
  pets: "Pets / kids",
};

export const SCENARIO_EMOJI: Record<Scenario, string> = {
  portrait: "👤",
  group: "👥",
  sunset: "🌅",
  food: "🍽️",
  lowlight: "🌙",
  action: "🏃",
  architecture: "🏛️",
  pets: "🐾",
};

export const SCENARIO_SUBTITLE: Record<Scenario, string> = {
  portrait: "Single person — flattering depth and skin tones",
  group: "3+ people — everyone in focus, no chopped heads",
  sunset: "Golden hour without blown-out highlights",
  food: "Restaurant or flat-lay food shots",
  lowlight: "Night, dim restaurants, indoor low light",
  action: "Kids running, sports, pets in motion",
  architecture: "Interiors and exteriors without warped lines",
  pets: "Fast-moving subjects with unpredictable eyes",
};

export const DEVICE_LABELS: Record<Device, string> = {
  iphone: "iPhone (12 and newer)",
  pixel: "Pixel (6 and newer)",
  samsung: "Samsung Galaxy (S22+)",
  android: "Other Android",
  dslr: "DSLR / Mirrorless",
};

export const DEVICE_SHORT: Record<Device, string> = {
  iphone: "iPhone",
  pixel: "Pixel",
  samsung: "Galaxy",
  android: "Android",
  dslr: "DSLR",
};

// ─────────────────────────────────────────────────────────────────────────────
// the 40 cards
// ─────────────────────────────────────────────────────────────────────────────

export const CARDS: Record<Scenario, Record<Device, Card>> = {
  portrait: {
    iphone: {
      mode: "Portrait → Natural Light or Studio",
      iso: "Auto",
      shutter: "Auto",
      aperture: "f/2.8 simulated (slide to f/4 for groups of features)",
      focus: "Tap and HOLD on the subject's nearest eye to lock AE/AF",
      tip: "Step back and zoom with your feet — Portrait Mode crops at ~1.5x and looks more flattering than digital zoom.",
    },
    pixel: {
      mode: "Portrait",
      iso: "Auto",
      shutter: "Auto",
      aperture: "Portrait blur slider — start at 50%, dial up to taste after",
      focus: "Tap subject's nearest eye; Pixel locks both face and depth",
      tip: "Pixel's Magic Eraser handles distracting background — review after shooting and remove anything that pulls attention from the face.",
    },
    samsung: {
      mode: "Portrait (Live Focus)",
      iso: "Auto",
      shutter: "Auto",
      aperture: "Live Focus blur — 5/7 is a sweet spot",
      focus: "Tap face; Samsung will auto-track if subject moves",
      tip: "On S23+ Pro mode shoots RAW — toggle it on for portraits you might edit later.",
    },
    android: {
      mode: "Portrait or Pro (manual)",
      iso: "100–400 if Pro available; otherwise Auto",
      shutter: "1/125+ handheld",
      aperture: "Whatever portrait blur the app offers",
      focus: "Tap subject's eye",
      tip: "Pro mode RAW (if your phone supports it) preserves skin tone gradients that Auto compresses.",
    },
    dslr: {
      mode: "Aperture Priority (A / Av)",
      iso: "100–400",
      shutter: "≥ 1/200 handheld (or 1/focal length)",
      aperture: "f/1.8–f/2.8 on a 50–85mm lens",
      focus: "Single-point AF on near eye; back-button focus if you can",
      tip: "85mm at f/2 is the classic portrait look — flattering compression, soft fall-off, eye in focus.",
    },
  },

  group: {
    iphone: {
      mode: "Photo (NOT Portrait — group fakes depth poorly)",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap the middle person; iPhone sets exposure for the cluster",
      tip: "Switch to 0.5x ultrawide and step closer — keeps everyone sharp, less distortion than 1x from farther back.",
    },
    pixel: {
      mode: "Photo (Top Shot on for group fidgeting)",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap the closest person to anchor focus and exposure",
      tip: "Top Shot quietly grabs a burst — go to the photo afterward, swipe up, and pick the frame where no one blinked.",
    },
    samsung: {
      mode: "Photo (Single Take if you can't direct the group)",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap middle person",
      tip: "Single Take grabs 10–20 variations at once — useful when half the group is laughing and half is settling.",
    },
    android: {
      mode: "Auto with HDR forced ON",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap a face in the middle of the group",
      tip: "Burst-shoot (hold the shutter) if your phone allows — closed eyes ruin more group photos than any other failure.",
    },
    dslr: {
      mode: "Aperture Priority",
      iso: "200–400",
      shutter: "1/125 minimum",
      aperture: "f/5.6–f/8 to keep everyone in focus",
      focus: "Single-point AF on the front row's eyes",
      tip: "35mm full-frame (≈ 24mm crop) is the right lens — wide enough for 6 people without standing across the parking lot.",
    },
  },

  sunset: {
    iphone: {
      mode: "Photo, swipe down −0.3 to −0.7 EV",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap on the brightest part of the sky to anchor exposure",
      tip: "Apple's HDR will fight you — turn it off (Settings → Camera → Smart HDR) when you want crushed silhouettes against a saturated sky.",
    },
    pixel: {
      mode: "Photo",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap horizon; Pixel's HDR+ handles the dynamic range",
      tip: "Pixel is unusually good at golden hour straight out of camera — let Auto do the work, then add warmth in Snapseed.",
    },
    samsung: {
      mode: "Pro — gives you EV and white-balance control",
      iso: "100",
      shutter: "1/250 to keep silhouettes dark",
      aperture: "fixed",
      focus: "Manual focus to infinity for the sky",
      tip: "Warm the white balance to 6500K+ to push the orange — Auto often cools it down 'correcting' the cast you actually want.",
    },
    android: {
      mode: "Auto with HDR ON; or Pro if available",
      iso: "100",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap horizon line",
      tip: "Shoot 20 seconds before AND 20 seconds after peak — the most flattering light is often after the sun is gone.",
    },
    dslr: {
      mode: "Aperture Priority with −0.7 EV",
      iso: "100",
      shutter: "Whatever priority sets — usually 1/200 to 1/500",
      aperture: "f/8–f/11 for landscape sharpness",
      focus: "Manual focus to infinity",
      tip: "Bracket: shoot at 0 EV, −1 EV, −2 EV. Blend in post if needed. Sunsets reward range.",
    },
  },

  food: {
    iphone: {
      mode: "Photo from 45° above (NOT Portrait — fakes blur on plates)",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap the hero ingredient (the meat, the egg, the cheese pull)",
      tip: "Move toward window light. Restaurant tungsten will make food look orange-sick — get within arm's reach of natural light if possible.",
    },
    pixel: {
      mode: "Photo, tap to focus, slide up to brighten",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap the part of the dish you'd eat first",
      tip: "Pixel's color science loves food — shoot from 45° above, fill the frame, don't zoom.",
    },
    samsung: {
      mode: "Food mode if available (S23+); otherwise Photo",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Food mode auto-detects the dish",
      tip: "Food mode subtly warms the white balance and adds a circular blur — it's the only built-in 'food filter' worth using.",
    },
    android: {
      mode: "Auto with the brightest exposure",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap the main dish",
      tip: "Flat lay over the table looks amateur — angle the camera at 30–45° from straight down for texture and depth.",
    },
    dslr: {
      mode: "Aperture Priority",
      iso: "400–800",
      shutter: "1/125 minimum (food is still but YOU shake)",
      aperture: "f/4–f/5.6 for a single dish; f/8 for spreads",
      focus: "Single point on the hero element",
      tip: "50mm macro at f/4 is the food-photographer cliché for a reason — close focus, flattering compression, soft fall-off.",
    },
  },

  lowlight: {
    iphone: {
      mode: "Night Mode (auto when the moon icon appears)",
      iso: "Auto",
      shutter: "1–3s — brace against something solid",
      aperture: "fixed",
      focus: "Tap subject; iPhone will pick the longest exposure it dares",
      tip: "Even if you're handholding, lean against a wall or rest your elbows on a table — every 0.5s of stability gets you more detail.",
    },
    pixel: {
      mode: "Night Sight (best on any phone, honestly)",
      iso: "Auto",
      shutter: "Up to 6s",
      aperture: "fixed",
      focus: "Tap subject, hold the phone steady through the countdown",
      tip: "Pixel's Astrophotography mode (under Night Sight when phone is propped) gives you 4-minute exposures — for clear-sky nights, it's stunning.",
    },
    samsung: {
      mode: "Night mode",
      iso: "Auto, capped around 3200",
      shutter: "Multi-second handheld",
      aperture: "fixed",
      focus: "Tap brightest part of the subject",
      tip: "Switch off Auto Night Mode if you want the moodier underexposed look — Auto sometimes brightens too much.",
    },
    android: {
      mode: "Look for Night mode; if absent, Pro mode and lower shutter manually",
      iso: "1600–3200",
      shutter: "1/30–1/4 (brace HARD)",
      aperture: "fixed",
      focus: "Tap brightest available subject",
      tip: "If your phone doesn't have Night mode, the rule is: bigger sensor wins. Switch to your main lens (NOT the telephoto) and get closer.",
    },
    dslr: {
      mode: "Aperture Priority or Manual",
      iso: "1600–6400 (modern bodies handle this fine)",
      shutter: "1/60 handheld with stabilization; longer on tripod",
      aperture: "f/1.8–f/2.8 wide open",
      focus: "Single point on the brightest part of the scene",
      tip: "Embrace grain. ISO 3200–6400 on a modern body looks like film. Trying to keep it 'clean' kills more low-light shots than it saves.",
    },
  },

  action: {
    iphone: {
      mode: "Burst (hold the shutter) or Action Mode for video",
      iso: "Auto",
      shutter: "Auto — short by default in Burst",
      aperture: "fixed",
      focus: "Tap subject; tracking auto-engages",
      tip: "Burst at 10 fps for ~1 second — review afterward and keep only the peak-action frame. Don't try to time the shutter manually.",
    },
    pixel: {
      mode: "Top Shot or Motion (panning) mode",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap subject and follow with the phone",
      tip: "Motion mode adds a panning blur that looks intentional — great for cyclists, runners, kids on scooters.",
    },
    samsung: {
      mode: "Pro mode — set shutter to 1/500+",
      iso: "400–800",
      shutter: "1/500 to 1/1000",
      aperture: "fixed",
      focus: "Tap subject; Continuous AF on",
      tip: "Burst-shoot in Pro mode to freeze impact moments — kids jumping, water splashing, balls hitting bats.",
    },
    android: {
      mode: "Burst if available; otherwise tap-tap-tap",
      iso: "400+",
      shutter: "Try 1/500+ in Pro",
      aperture: "fixed",
      focus: "Continuous AF on if your camera has it",
      tip: "Anticipate the action — frame where the subject will BE, not where they are. Phones lag.",
    },
    dslr: {
      mode: "Shutter Priority (S / Tv)",
      iso: "400–1600",
      shutter: "1/500 to 1/2000 to freeze motion",
      aperture: "Whatever priority sets — usually f/4 to f/5.6",
      focus: "Continuous AF (AF-C / AI Servo) with subject tracking",
      tip: "70–200mm f/2.8 is the sports lens of choice. Slower lens? Go wider and crop in post.",
    },
  },

  architecture: {
    iphone: {
      mode: "Photo, 0.5x ultrawide for tight spaces",
      iso: "100–200 if controllable; otherwise Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap a mid-distance element; check the level overlay",
      tip: "Turn on the level grid (Settings → Camera → Grid). Crooked horizons are the #1 thing that says 'amateur' in architecture photos.",
    },
    pixel: {
      mode: "Photo, 0.5x ultrawide",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap mid-distance",
      tip: "Pixel's auto-perspective correction is good — but if you're going to edit later, shoot wider than you think to give yourself crop room.",
    },
    samsung: {
      mode: "Photo or Pro",
      iso: "100–400",
      shutter: "1/60+ handheld",
      aperture: "fixed",
      focus: "Tap mid-distance",
      tip: "Samsung's ultrawide goes very wide — watch the corners for stretched details. Step back instead of going wider if you can.",
    },
    android: {
      mode: "Auto or Pro with low ISO",
      iso: "100–200",
      shutter: "Auto handheld; 1/30+ braced",
      aperture: "fixed",
      focus: "Mid-distance element",
      tip: "Two-second timer + propping the phone on a railing/ledge = miniature tripod. Sharper than handheld every time.",
    },
    dslr: {
      mode: "Aperture Priority on a tripod if possible",
      iso: "100",
      shutter: "Whatever priority sets",
      aperture: "f/8–f/11 — deep focus, sharpest part of most lenses",
      focus: "Focus 1/3 into the scene (hyperfocal-ish)",
      tip: "Tilt-shift if you own one; otherwise keep the camera level and crop in post — leaning back to fit a tall building introduces converging-line distortion.",
    },
  },

  pets: {
    iphone: {
      mode: "Burst, Portrait if pet is still",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap and HOLD on the nearest eye — most cameras nail dog eyes",
      tip: "Get low. Eye-level with the pet beats shooting down at them every time — it's the single biggest thing separating pet photos from snapshots.",
    },
    pixel: {
      mode: "Top Shot — captures bursts and picks the best",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Tap eye; Pixel's animal-eye AF is good",
      tip: "Squeak a toy off-camera right before the shot — gets ears up and a head-tilt that reads alert.",
    },
    samsung: {
      mode: "Single Take or Photo with burst",
      iso: "Auto",
      shutter: "Auto",
      aperture: "fixed",
      focus: "Pet's eye",
      tip: "Single Take is great with pets — captures 15 variations including AI-picked 'best of'. Worth using when you only have one chance.",
    },
    android: {
      mode: "Burst (hold shutter)",
      iso: "Auto",
      shutter: "Auto — 1/250+ for kids and dogs",
      aperture: "fixed",
      focus: "Continuous AF on eye",
      tip: "Phone cameras lag — anticipate. For a dog running TOWARD you, focus on a fixed spot they're about to cross and shoot when they hit it.",
    },
    dslr: {
      mode: "Aperture Priority with eye-AF",
      iso: "400–800 indoors; 200–400 outdoors",
      shutter: "1/500 minimum for any motion",
      aperture: "f/2.8–f/4",
      focus: "Animal-Eye AF if your body has it; otherwise single point",
      tip: "85mm f/1.8 is the pet portrait lens — short enough to use indoors, fast enough for low-light eye AF.",
    },
  },
};
