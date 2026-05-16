"""OpenAI-compatible adapter for text + vision AI calls.

Works with any OpenAI-compatible chat-completions endpoint:
  - OpenRouter (default): https://openrouter.ai/api/v1
  - OpenAI direct:        https://api.openai.com/v1
  - LiteLLM proxy:        https://your-litellm.example.com
  - Together AI, Groq, Anyscale, Fireworks, ...

Per-request config: the caller passes a `ProviderConfig` (base URL, key,
model). When unset, falls back to env. When BOTH are absent, returns a
deterministic mock so the UI works end-to-end with zero keys.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any

import httpx

from providers import ProviderConfig

logger = logging.getLogger(__name__)

HTTP_REFERER = os.getenv("OPENROUTER_REFERER", "https://poselab.local")
X_TITLE = os.getenv("OPENROUTER_TITLE", "PoseLab")


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: scenario detection
# ─────────────────────────────────────────────────────────────────────────────


async def detect_scenario(
    image_bytes: bytes,
    system_prompt: str,
    cfg: ProviderConfig,
) -> tuple[str, str]:
    """Quickly classify the photo into a KB scenario.

    Returns (scenario_key, one_line_reasoning). Falls back to ("portrait", "")
    on any error so the pipeline never blocks on classification.
    """
    if not cfg.ai_configured:
        return "portrait", "mock classification"

    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:image/jpeg;base64,{b64}"
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": system_prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }
    ]
    try:
        raw = await _chat_json(messages, cfg=cfg, model=cfg.vision_model, max_tokens=120)
    except Exception:
        logger.warning("scenario detection call failed; falling back", exc_info=True)
        return "portrait", "classification failed; defaulting"

    scenario = (raw.get("scenario") or "").strip().lower()
    reasoning = (raw.get("reasoning") or "").strip()
    if scenario not in {
        "portrait",
        "group",
        "sunset",
        "food",
        "lowlight",
        "action",
        "architecture",
        "pets",
        "other",
    }:
        scenario = "other"
    return scenario, reasoning


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: critique with the relevant tradition
# ─────────────────────────────────────────────────────────────────────────────


async def suggest_from_image(
    image_bytes: bytes,
    system_prompt: str,
    cfg: ProviderConfig,
) -> dict[str, Any]:
    """Call vision model with the photo + scenario-aware critique prompt."""
    if not cfg.ai_configured:
        return _mock_suggest()

    b64 = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:image/jpeg;base64,{b64}"
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": system_prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }
    ]
    raw = await _chat_json(messages, cfg=cfg, model=cfg.vision_model)
    return _coerce_suggest_shape(raw)


async def prompt_from_choices(system_prompt: str, cfg: ProviderConfig) -> dict[str, Any]:
    """Call text model with the system prompt (already includes user choices).
    Returns parsed JSON with 'prompt' and 'alt_prompts'."""
    if not cfg.ai_configured:
        return _mock_prompt(system_prompt)

    messages = [{"role": "user", "content": system_prompt}]
    raw = await _chat_json(messages, cfg=cfg, model=cfg.text_model)
    return _coerce_prompt_shape(raw)


# ──────────────────────────────────────────────────────────────────────────────
# Internals
# ──────────────────────────────────────────────────────────────────────────────


async def _chat_json(
    messages: list[dict[str, Any]],
    *,
    cfg: ProviderConfig,
    model: str,
    max_tokens: int = 1000,
) -> dict[str, Any]:
    """OpenAI-compatible chat-completions. Parses JSON from the assistant reply."""
    headers = {
        "Authorization": f"Bearer {cfg.ai_key}",
        "Content-Type": "application/json",
        # OpenRouter recommends these headers for attribution. Other providers
        # (OpenAI, LiteLLM, Together) ignore them harmlessly.
        "HTTP-Referer": HTTP_REFERER,
        "X-Title": X_TITLE,
    }
    payload = {
        "model": model,
        "messages": messages,
        # Force JSON output where supported. Gemini honors response_format.
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{cfg.ai_base_url.rstrip('/')}/chat/completions",
            headers=headers,
            json=payload,
        )
    if resp.status_code >= 400:
        # Don't leak provider error text to the user
        logger.warning(
            "ai-provider %s: %s", resp.status_code, resp.text[:200]
        )
        resp.raise_for_status()

    data = resp.json()
    choice = (data.get("choices") or [{}])[0]
    content = (choice.get("message") or {}).get("content") or ""
    return _parse_json_loose(content)


def _parse_json_loose(text: str) -> dict[str, Any]:
    """Models sometimes wrap JSON in code fences. Strip them."""
    text = text.strip()
    if text.startswith("```"):
        # ```json\n{...}\n```
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Find the outermost JSON object substring
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
        logger.warning("Failed to parse JSON from model output: %s", text[:200])
        return {}


def _coerce_suggest_shape(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize the suggest response into {recommended, options} per category.

    Defends against:
      - legacy string-only shape (fallback: synthesize options around recommended)
      - missing keys
      - options shorter than 2 entries
    """
    s = raw.get("suggestions") or {}

    return {
        "scene_detected": raw.get("scene_detected") or "a photo",
        "issues": (raw.get("issues") or [])[:3],
        "suggestions": {
            "pose": _coerce_category(
                s.get("pose"),
                default_recommended="Keep as is",
                default_options=("Keep as is",),
            ),
            "background": _coerce_category(
                s.get("background"),
                default_recommended="Keep as is",
                default_options=("Keep as is",),
            ),
            "lighting": _coerce_category(
                s.get("lighting"),
                default_recommended="Keep as is",
                default_options=("Keep as is",),
            ),
            "style": _coerce_category(
                s.get("style"),
                default_recommended="Natural",
                default_options=(
                    "Editorial",
                    "Cinematic",
                    "Film (Portra 400)",
                    "B&W",
                    "Natural",
                ),
            ),
            "focus": _coerce_category(
                s.get("focus"),
                default_recommended="Sharp subject + soft bg",
                default_options=(
                    "Keep as is",
                    "Sharp subject + soft bg",
                    "Everything sharp",
                    "Dreamy/soft",
                ),
            ),
        },
    }


def _coerce_category(
    raw: Any,
    *,
    default_recommended: str,
    default_options: tuple[str, ...],
) -> dict[str, Any]:
    """Accept either the new {recommended, options} shape or a legacy string."""
    # New shape from the AI
    if isinstance(raw, dict):
        recommended = (raw.get("recommended") or "").strip() or default_recommended
        opts = raw.get("options")
        if isinstance(opts, list) and opts:
            cleaned = [str(o).strip() for o in opts if str(o).strip()]
            # Make sure recommended is in the options list (some models omit it)
            if recommended not in cleaned:
                cleaned = [recommended] + cleaned
            return {"recommended": recommended, "options": cleaned[:6]}
        return {
            "recommended": recommended,
            "options": list(default_options) or [recommended],
        }
    # Legacy: string only
    if isinstance(raw, str) and raw.strip():
        recommended = raw.strip()
        opts = list(default_options)
        if recommended not in opts:
            opts = [recommended] + opts
        return {"recommended": recommended, "options": opts[:6]}
    # Nothing usable
    return {
        "recommended": default_recommended,
        "options": list(default_options) or [default_recommended],
    }


def _coerce_prompt_shape(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "prompt": raw.get("prompt") or "",
        "alt_prompts": (raw.get("alt_prompts") or [])[:2],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Mocks (deterministic, runnable with zero API keys)
# ──────────────────────────────────────────────────────────────────────────────


def _mock_suggest() -> dict[str, Any]:
    return {
        "scene_detected": "outdoor portrait, soft natural light",
        "issues": [
            "background a bit busy",
            "subject slightly off-center",
            "skin tones cool",
        ],
        "suggestions": {
            "pose": {
                "recommended": "Turn 45° from camera, chin down slightly",
                "options": [
                    "Keep as is",
                    "Turn 45° from camera, chin down slightly",
                    "Confident upright, shoulders squared",
                    "Candid mid-laugh, looking off-frame",
                ],
            },
            "background": {
                "recommended": "Soft blur, f/1.8 look",
                "options": [
                    "Keep as is",
                    "Soft blur, f/1.8 look",
                    "Clean neutral wall replacement",
                    "Warm bokeh, indoor cafe vibe",
                ],
            },
            "lighting": {
                "recommended": "Soft window light from left",
                "options": [
                    "Keep as is",
                    "Soft window light from left",
                    "Golden hour warm glow",
                    "Dramatic side lighting",
                ],
            },
            "style": {
                "recommended": "Cinematic",
                "options": [
                    "Editorial",
                    "Cinematic",
                    "Film (Portra 400)",
                    "B&W",
                    "Natural",
                ],
            },
            "focus": {
                "recommended": "Sharp subject + soft bg",
                "options": [
                    "Keep as is",
                    "Sharp subject + soft bg",
                    "Everything sharp",
                    "Dreamy/soft",
                ],
            },
        },
    }


def _mock_prompt(_system_prompt: str) -> dict[str, Any]:
    return {
        "prompt": (
            "Recompose as cinematic portrait with soft window light from the "
            "left, background blurred like f/1.8, warm skin tones with subtle "
            "teal shadows, preserve subject's face and identity. Sharp focus "
            "on eyes."
        ),
        "alt_prompts": [
            "Same scene, 1990s Kodak Portra 400 film aesthetic, slight "
            "overexposure, faded blacks, preserve subject's face and identity.",
            "High-fashion B&W conversion, dramatic side lighting, deep blacks, "
            "retain skin and fabric detail, preserve subject's face and identity.",
        ],
    }
