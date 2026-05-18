/**
 * Shared types between client and the FastAPI backend.
 * Keep these in sync with api/models.py.
 */

export type Plan = "free" | "paid";

export type Usage = {
  count_today: number;
  limit: number;
  plan: Plan;
};

/** AI-generated options for a single edit category. */
export type CategorySuggestion = {
  /** The AI's top pick for THIS specific photo. */
  recommended: string;
  /** 4-5 dynamic alternatives the user can pick from. */
  options: string[];
};

export type Suggestions = {
  pose: CategorySuggestion;
  background: CategorySuggestion;
  lighting: CategorySuggestion;
  style: CategorySuggestion;
  focus: CategorySuggestion;
};

export type SuggestData = {
  scene_detected: string;
  issues: string[];
  suggestions: Suggestions;
  analysis_id: string;
  /** Which photography tradition this analysis used — backend KB key. */
  scenario: Scenario;
  /** One-phrase justification for the scenario choice (transparency). */
  scenario_reasoning: string;
  /** Named photographers whose principles informed this analysis. */
  tradition: string[];
};

export type PromptData = {
  prompt: string;
  alt_prompts: string[];
  public_url: string | null;
  analysis_id: string;
};

export type GenerateData = {
  enhanced_url: string;
  model: string;
  duration_ms: number;
};

export type UploadResponse = {
  ok: true;
  image_id: string;
  image_url: string;
};

export type AnalyzeResponse =
  | { ok: true; mode: "suggest"; data: SuggestData; usage: Usage }
  | { ok: true; mode: "prompt"; data: PromptData; usage: Usage };

export type GenerateResponse = {
  ok: true;
  data: GenerateData;
  usage: Usage;
};

export type ApiError = {
  ok: false;
  error: string;
  message: string;
};

export type PublicShareData = {
  slug: string;
  image_url: string;
  enhanced_url: string | null;
  prompt: string;
  issues: string[];
  suggestions: Suggestions | null;
  final_form: FinalForm | null;
  is_paid: boolean;
  face_blur: boolean;
  created_at: string;
};

export type FinalForm = {
  pose: string | null;
  background: string | null;
  lighting: string | null;
  style: string | null;
  focus: string | null;
  freetext: string | null;
};

export type ShareResponse = {
  ok: true;
  data: PublicShareData;
};

export type CategoryKey = keyof Suggestions; // "pose" | "background" | ...

/**
 * Category labels that adapt per scenario. "Pose" on a portrait makes sense;
 * on a food shot it should read "Subject / angle"; on architecture it's
 * "Vantage". The form input value is still the user's chosen option string.
 */
export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  pose: "Pose",
  background: "Background",
  lighting: "Lighting",
  style: "Style",
  focus: "Focus",
};

export type Scenario =
  | "portrait"
  | "group"
  | "sunset"
  | "food"
  | "lowlight"
  | "action"
  | "architecture"
  | "pets"
  | "macro"
  | "other";

/** Per-scenario overrides for category labels — only override what's different. */
const SCENARIO_LABEL_OVERRIDES: Partial<
  Record<Scenario, Partial<Record<CategoryKey, string>>>
> = {
  food: { pose: "Angle & framing" },
  architecture: { pose: "Vantage & framing" },
  sunset: { pose: "Composition & framing" },
  action: { pose: "Moment & framing" },
  macro: { pose: "Angle & magnification" },
  other: { pose: "Composition" },
};

export function labelFor(category: CategoryKey, scenario: Scenario): string {
  return (
    SCENARIO_LABEL_OVERRIDES[scenario]?.[category] ?? CATEGORY_LABELS[category]
  );
}
