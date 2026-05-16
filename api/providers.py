"""Per-request provider configuration — the BYOK ("bring your own key") layer.

Goal: anyone who clones the repo can `pnpm dev` + `uvicorn main:app` and use
their OWN keys via the web UI, without ever editing api/.env.

Flow:
  1. User opens the web app, hits Settings, enters their keys.
  2. Frontend stores keys in localStorage, sends them on every request as
     custom headers (X-AI-Key, X-AI-Base-URL, X-OpenAI-Key, X-Fal-Key, ...).
  3. This module reads those headers per request.
  4. If a header is absent, falls back to the corresponding env var (so
     self-hosters who DO want to set keys in .env can still do that).

Why headers (not session cookies):
  - Stateless: no need for a key-storage table.
  - Easy to debug: curl can pass them just as cleanly as the web client.
  - Cleanly per-request: rate-limit each user by their own quota.

Security notes:
  - Keys are transit-only on the server. We never persist them.
  - Server logs strip keys via `safe_repr()`.
  - When deployed to a public URL, the operator should put TLS in front (Caddy,
    Cloudflare, Vercel proxy, etc.) so keys aren't sent in clear text.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

from fastapi import Request


# ─────────────────────────────────────────────────────────────────────────────
# Header names — keep in sync with web/lib/api.ts
# ─────────────────────────────────────────────────────────────────────────────

# Text/Vision AI (OpenAI-compatible: OpenAI, OpenRouter, LiteLLM, Together, etc.)
H_AI_BASE_URL = "x-ai-base-url"
H_AI_KEY = "x-ai-key"
H_AI_VISION_MODEL = "x-ai-vision-model"
H_AI_TEXT_MODEL = "x-ai-text-model"

# Image gen
H_IMAGE_PROVIDER = "x-image-provider"  # "openai" | "fal" | "auto"
H_OPENAI_KEY = "x-openai-key"
H_OPENAI_IMAGE_MODEL = "x-openai-image-model"
H_FAL_KEY = "x-fal-key"
H_FAL_MODEL = "x-fal-model"


ImageProvider = Literal["openai", "fal", "auto"]


@dataclass(frozen=True)
class ProviderConfig:
    """Resolved per-request provider settings.

    Each field has a header source AND an env fallback. Headers always win
    when present (and non-empty) — this is what makes BYOK work.
    """

    # Text / Vision (OpenAI-compatible API)
    ai_base_url: str
    ai_key: str
    vision_model: str
    text_model: str

    # Image generation
    image_provider: ImageProvider
    openai_key: str
    openai_image_model: str
    fal_key: str
    fal_model: str

    # ─── computed helpers ─────────────────────────────────────────────────

    @property
    def ai_configured(self) -> bool:
        return bool(self.ai_key)

    @property
    def openai_image_configured(self) -> bool:
        return bool(self.openai_key)

    @property
    def fal_configured(self) -> bool:
        return bool(self.fal_key)

    def resolved_image_provider(self) -> str:
        """Pick a provider name. 'auto' resolves to first-configured."""
        if self.image_provider != "auto":
            return self.image_provider
        if self.openai_image_configured:
            return "openai"
        if self.fal_configured:
            return "fal"
        return "openai"  # falls back to mock echo


def _header_or_env(request: Request, header: str, env_var: str, default: str = "") -> str:
    h = request.headers.get(header)
    if h is not None and h.strip():
        return h.strip()
    return (os.getenv(env_var) or default).strip()


def get_provider_config(request: Request) -> ProviderConfig:
    """FastAPI dependency. Resolves provider settings from headers + env."""
    image_provider_raw = (
        _header_or_env(request, H_IMAGE_PROVIDER, "IMAGE_PROVIDER", "auto")
        .lower()
        .strip()
    )
    if image_provider_raw not in ("openai", "fal", "auto"):
        image_provider_raw = "auto"

    return ProviderConfig(
        ai_base_url=_header_or_env(
            request,
            H_AI_BASE_URL,
            "OPENROUTER_BASE_URL",
            "https://openrouter.ai/api/v1",
        ),
        ai_key=_header_or_env(request, H_AI_KEY, "OPENROUTER_API_KEY"),
        vision_model=_header_or_env(
            request,
            H_AI_VISION_MODEL,
            "AI_VISION_MODEL",
            "google/gemini-2.5-flash",
        ),
        text_model=_header_or_env(
            request,
            H_AI_TEXT_MODEL,
            "AI_TEXT_MODEL",
            "google/gemini-2.5-flash",
        ),
        image_provider=image_provider_raw,  # type: ignore[arg-type]
        openai_key=_header_or_env(request, H_OPENAI_KEY, "OPENAI_API_KEY"),
        openai_image_model=_header_or_env(
            request,
            H_OPENAI_IMAGE_MODEL,
            "OPENAI_IMAGE_MODEL",
            "gpt-image-2",
        ),
        fal_key=_header_or_env(request, H_FAL_KEY, "FAL_KEY"),
        fal_model=_header_or_env(
            request, H_FAL_MODEL, "FAL_MODEL", "fal-ai/flux-pro/kontext"
        ),
    )


def safe_repr(cfg: ProviderConfig) -> dict[str, str]:
    """Logging-safe representation. Keys are redacted to a short fingerprint."""

    def fp(s: str) -> str:
        if not s:
            return "(unset)"
        return f"{s[:6]}...{s[-3:]}" if len(s) > 12 else "(short)"

    return {
        "ai_base_url": cfg.ai_base_url,
        "ai_key": fp(cfg.ai_key),
        "vision_model": cfg.vision_model,
        "text_model": cfg.text_model,
        "image_provider": cfg.image_provider,
        "openai_key": fp(cfg.openai_key),
        "fal_key": fp(cfg.fal_key),
    }
