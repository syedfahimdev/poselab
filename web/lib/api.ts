/**
 * Thin client for the FastAPI backend. Adds:
 *  - Anonymous-ID header for unauthed requests
 *  - Unified error shape (throws ApiClientError)
 *  - Sane timeouts
 */

import type {
  AnalyzeResponse,
  ApiError,
  FinalForm,
  GenerateResponse,
  ShareResponse,
  UploadResponse,
} from "./types";
import { getOrCreateAnonId } from "./anonId";
import { getDevSession } from "./devSession";
import { buildProviderHeaders } from "./settings";

// Default to /api-proxy (same-origin) — works on localhost, LAN IP, AND any
// public tunnel without CORS or two-URL gymnastics. Set NEXT_PUBLIC_API_BASE_URL
// to override (e.g. when calling FastAPI directly during a backend-only test).
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api-proxy";
const DEFAULT_TIMEOUT_MS = 60_000; // generous; vision calls can take ~5s

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "unknown") {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const anonId = getOrCreateAnonId();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    const headers = new Headers(init.headers);
    if (anonId) headers.set("X-Anon-Id", anonId);

    // BYOK: inject the user's provider config from Settings as X-* headers.
    // Backend reads these first, falls back to env. Empty values aren't sent.
    for (const [name, value] of Object.entries(buildProviderHeaders())) {
      if (!headers.has(name)) headers.set(name, value);
    }

    // Dev-only signed-in state: send `Bearer dev:<email>`, which the backend
    // accepts when ALLOW_DEV_AUTH=1 and no Supabase secret is configured.
    const dev = getDevSession();
    if (dev?.email && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer dev:${dev.email}`);
    }

    // Don't set Content-Type for FormData; the browser handles boundary.
    if (
      init.body &&
      !(init.body instanceof FormData) &&
      !headers.has("Content-Type")
    ) {
      headers.set("Content-Type", "application/json");
    }
    // Skip ngrok's "Visit Site" interstitial when we're proxied through one
    headers.set("ngrok-skip-browser-warning", "true");
    const res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      credentials: "include",
    });
    const text = await res.text();
    const parsed = text ? safeJSON(text) : null;

    if (!res.ok) {
      const err = parsed as ApiError | null;
      throw new ApiClientError(
        err?.message ?? `Request failed (${res.status})`,
        res.status,
        err?.error ?? "http_error",
      );
    }

    return parsed as T;
  } catch (err) {
    if (err instanceof ApiClientError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiClientError("Request timed out", 0, "timeout");
    }
    throw new ApiClientError(
      err instanceof Error ? err.message : "Network error",
      0,
      "network",
    );
  } finally {
    clearTimeout(timer);
  }
}

function safeJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// public methods
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("image", file);
  return request<UploadResponse>("/upload", { method: "POST", body: form });
}

export async function analyzeSuggest(
  imageId: string,
  imageUrl: string,
): Promise<Extract<AnalyzeResponse, { mode: "suggest" }>> {
  const form = new FormData();
  form.append("mode", "suggest");
  form.append("image_id", imageId);
  form.append("image_url", imageUrl);
  return request("/analyze", { method: "POST", body: form });
}

export async function analyzePrompt(
  imageId: string,
  imageUrl: string,
  finalForm: FinalForm,
  scenario?: string,
  issues?: string[],
): Promise<Extract<AnalyzeResponse, { mode: "prompt" }>> {
  const form = new FormData();
  form.append("mode", "prompt");
  form.append("image_id", imageId);
  form.append("image_url", imageUrl);
  // Echo back the detected scenario so the backend builds a prompt using the
  // matching tradition's vocabulary instead of re-classifying.
  if (scenario) form.append("scenario", scenario);
  // Forward the detected issues so the backend can pick matching Photoshop
  // techniques (e.g. "skin tones cool" → skin-tone HSL correction).
  if (issues && issues.length > 0) {
    for (const issue of issues) form.append("issues", issue);
  }
  if (finalForm.pose) form.append("pose", finalForm.pose);
  if (finalForm.background) form.append("background", finalForm.background);
  if (finalForm.lighting) form.append("lighting", finalForm.lighting);
  if (finalForm.style) form.append("style", finalForm.style);
  if (finalForm.focus) form.append("focus", finalForm.focus);
  if (finalForm.freetext) form.append("freetext", finalForm.freetext);
  return request("/analyze", { method: "POST", body: form });
}

export async function generateImage(args: {
  prompt: string;
  imageUrl: string;
  analysisId: string;
}): Promise<GenerateResponse> {
  return request<GenerateResponse>("/generate", {
    method: "POST",
    body: JSON.stringify({
      prompt: args.prompt,
      image_url: args.imageUrl,
      analysis_id: args.analysisId,
    }),
    timeoutMs: 120_000, // fal.ai jobs can take ~30s
  });
}

export async function getShare(slug: string): Promise<ShareResponse> {
  return request<ShareResponse>(`/share/${slug}`);
}
