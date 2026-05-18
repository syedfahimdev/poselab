"""Stability AI image-edit adapter (v2beta /stable-image/generate/sd3).

Stability's SD3.5 family handles image-to-image well — it's a generative
model rather than a dedicated identity-preserving editor (unlike gpt-image-2
or FLUX Kontext), so we default `strength` low (~0.4) to keep the original
recognizable. Lower strength = closer to source; higher = more creative.

API contract:
  - POST  https://api.stability.ai/v2beta/stable-image/generate/sd3
  - Bearer auth via Authorization header
  - multipart/form-data body
  - With `Accept: image/*` the response is raw image bytes (not JSON) —
    cuts a round trip vs the JSON-with-base64 alternative

Model identifiers:
  - sd3.5-medium  (faster, cheaper)
  - sd3.5-large   (default — best quality)
  - sd3.5-large-turbo
"""

from __future__ import annotations

import io
import logging
import os
import time

import httpx
from PIL import Image

from providers import ProviderConfig

logger = logging.getLogger(__name__)

STABILITY_BASE_URL = os.getenv(
    "STABILITY_BASE_URL", "https://api.stability.ai/v2beta/stable-image/generate/sd3"
)
STABILITY_STRENGTH = float(os.getenv("STABILITY_STRENGTH", "0.4"))
STABILITY_REQUEST_TIMEOUT = 180.0


async def generate(
    *,
    prompt: str,
    image_bytes: bytes,
    cfg: ProviderConfig,
) -> tuple[bytes, int, str]:
    """Edit `image_bytes` via Stability SD3.5. Returns (bytes, duration_ms, model).

    Echoes source when no key is configured (mock mode).
    """
    started = time.monotonic()

    if not cfg.stability_configured:
        duration = int((time.monotonic() - started) * 1000)
        return image_bytes, duration, "mock/echo"

    # SD3 expects the input as a regular file upload, not a data URI
    headers = {
        "Authorization": f"Bearer {cfg.stability_key}",
        # CRUCIAL: this asks Stability to stream image bytes back rather than
        # wrap them in a base64-encoded JSON envelope. Saves a parse step.
        "Accept": "image/*",
    }
    files = {
        "image": ("source.jpg", image_bytes, "image/jpeg"),
    }
    data = {
        "prompt": prompt,
        "mode": "image-to-image",
        "model": cfg.stability_model,
        "strength": str(STABILITY_STRENGTH),
        "output_format": "jpeg",
    }

    async with httpx.AsyncClient(timeout=STABILITY_REQUEST_TIMEOUT) as client:
        resp = await client.post(
            STABILITY_BASE_URL, headers=headers, files=files, data=data
        )
        if resp.status_code >= 400:
            # Stability returns JSON errors even when we asked for image/*
            err_text = resp.text[:300]
            logger.warning("stability %s: %s", resp.status_code, err_text)
            raise RuntimeError(f"Stability {resp.status_code}: {err_text}")
        result_bytes = resp.content

    # Normalize to JPEG for consistency with the other providers
    out_jpeg = _to_jpeg(result_bytes)

    duration = int((time.monotonic() - started) * 1000)
    return out_jpeg, duration, cfg.stability_model


def _to_jpeg(raw: bytes) -> bytes:
    with Image.open(io.BytesIO(raw)) as im:
        im = im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=92, optimize=True)
        return buf.getvalue()
