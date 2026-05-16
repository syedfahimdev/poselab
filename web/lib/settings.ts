/**
 * BYOK ("bring your own key") settings store.
 *
 * Anyone running PoseLab can plug in their preferred provider via the
 * Settings panel — keys live in localStorage and ride on every API call
 * as custom headers. The backend resolves headers > env (see api/providers.py).
 *
 * Why localStorage and not cookies / server session?
 *   - No server-side state → trivial to self-host
 *   - Survives reloads; user only has to configure once
 *   - Per-device by design (no key sync between devices, which is fine for
 *     a BYOK tool — each device is "your" device)
 *
 * Privacy note: any browser extension or XSS on this origin can read the
 * keys. Mitigations: prompt-injection-resistant content sanitization on
 * the result page, careful third-party script policy (we have zero), and
 * a Settings panel "clear keys" button so users can wipe them.
 */

const KEY = "poselab_settings_v1";

export type ImageProvider = "openai" | "fal" | "runware" | "auto";

export type AppSettings = {
  version: 1;

  // Text / Vision AI (OpenAI-compatible)
  aiBaseUrl: string;
  aiKey: string;
  visionModel: string;
  textModel: string;

  // Image generation
  imageProvider: ImageProvider;
  openaiKey: string;
  openaiImageModel: string;
  falKey: string;
  falModel: string;
  runwareKey: string;
  runwareModel: string;
};

/** A blank-but-defaults settings object. Used on first run. */
export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  aiBaseUrl: "https://openrouter.ai/api/v1",
  aiKey: "",
  visionModel: "google/gemini-2.5-flash",
  textModel: "google/gemini-2.5-flash",
  imageProvider: "auto",
  openaiKey: "",
  openaiImageModel: "gpt-image-2",
  falKey: "",
  falModel: "fal-ai/flux-pro/kontext",
  runwareKey: "",
  runwareModel: "openai:gpt-image@2",
};

/**
 * Curated preset list shown in the Settings UI. Each preset prefills
 * baseUrl + sensible default model names; users supply the key.
 */
export const AI_PRESETS: Array<{
  id: string;
  label: string;
  baseUrl: string;
  visionModel: string;
  textModel: string;
  keyHint: string;
  signupUrl: string;
}> = [
  {
    id: "openrouter",
    label: "OpenRouter (recommended — many models, one key)",
    baseUrl: "https://openrouter.ai/api/v1",
    visionModel: "google/gemini-2.5-flash",
    textModel: "google/gemini-2.5-flash",
    keyHint: "sk-or-v1-...",
    signupUrl: "https://openrouter.ai/keys",
  },
  {
    id: "openai",
    label: "OpenAI direct (GPT-4o, GPT-5)",
    baseUrl: "https://api.openai.com/v1",
    visionModel: "gpt-4o-mini",
    textModel: "gpt-4o-mini",
    keyHint: "sk-...",
    signupUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "groq",
    label: "Groq (fast, cheap, vision via Llama)",
    baseUrl: "https://api.groq.com/openai/v1",
    visionModel: "llama-3.2-90b-vision-preview",
    textModel: "llama-3.3-70b-versatile",
    keyHint: "gsk_...",
    signupUrl: "https://console.groq.com/keys",
  },
  {
    id: "together",
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    visionModel: "meta-llama/Llama-Vision-Free",
    textModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    keyHint: "...",
    signupUrl: "https://api.together.xyz/settings/api-keys",
  },
  {
    id: "litellm",
    label: "LiteLLM proxy (self-hosted)",
    baseUrl: "https://your-litellm.example.com",
    visionModel: "gemini-2.5-flash",
    textModel: "gemini-2.5-flash",
    keyHint: "your master key",
    signupUrl: "https://github.com/BerriAI/litellm",
  },
  {
    id: "custom",
    label: "Custom (any OpenAI-compatible endpoint)",
    baseUrl: "",
    visionModel: "",
    textModel: "",
    keyHint: "...",
    signupUrl: "",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    if (parsed.version !== 1) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...parsed, version: 1 };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const merged = { ...getSettings(), ...partial, version: 1 as const };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("poselab:settings-changed"));
  }
  return merged;
}

export function clearSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("poselab:settings-changed"));
}

/** Used by the first-run prompt — true once user has configured anything. */
export function hasAnyAiKey(s: AppSettings = getSettings()): boolean {
  return Boolean(s.aiKey);
}

export function hasAnyImageKey(s: AppSettings = getSettings()): boolean {
  return Boolean(s.openaiKey || s.falKey || s.runwareKey);
}

/**
 * Build the header set that ai.py / openai_image.py / fal.py read on the
 * backend. Headers are only included when non-empty so the server falls
 * back to its env vars cleanly.
 */
export function buildProviderHeaders(s: AppSettings = getSettings()): Record<string, string> {
  const h: Record<string, string> = {};
  if (s.aiBaseUrl) h["X-AI-Base-URL"] = s.aiBaseUrl;
  if (s.aiKey) h["X-AI-Key"] = s.aiKey;
  if (s.visionModel) h["X-AI-Vision-Model"] = s.visionModel;
  if (s.textModel) h["X-AI-Text-Model"] = s.textModel;
  if (s.imageProvider) h["X-Image-Provider"] = s.imageProvider;
  if (s.openaiKey) h["X-OpenAI-Key"] = s.openaiKey;
  if (s.openaiImageModel) h["X-OpenAI-Image-Model"] = s.openaiImageModel;
  if (s.falKey) h["X-Fal-Key"] = s.falKey;
  if (s.falModel) h["X-Fal-Model"] = s.falModel;
  if (s.runwareKey) h["X-Runware-Key"] = s.runwareKey;
  if (s.runwareModel) h["X-Runware-Model"] = s.runwareModel;
  return h;
}
