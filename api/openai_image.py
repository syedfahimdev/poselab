"""OpenAI image-edit adapter — gpt-image-2 by default.

OpenAI's `gpt-image-2` (April 2026) introduced region-aware editing that
explicitly preserves identity (faces, logos, lighting) while applying the
prompted changes — significantly better at identity preservation than FLUX
Pro Kontext in our testing.

Endpoint: POST https://api.openai.com/v1/images/edits  (multipart/form-data)

Key params we send:
  - image: PNG of the source (we re-encode to PNG since edit API requires it)
  - prompt: the edit instruction
  - model: gpt-image-2 (latest)
  - size: 1024x1024 default; could be 1024x1536 or 1536x1024
  - quality: high | medium | low — high is the editorial-grade output
  - response_format: b64_json (avoids extra fetch for the result)

When OPENAI_API_KEY is unset, returns the source bytes unchanged so mock mode
behaves like fal.py — UI flow works end-to-end without keys.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import time

import httpx
from PIL import Image

from providers import ProviderConfig

logger = logging.getLogger(__name__)

OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_IMAGE_QUALITY = os.getenv("OPENAI_IMAGE_QUALITY", "high")
OPENAI_IMAGE_SIZE = os.getenv("OPENAI_IMAGE_SIZE", "1024x1024")
OPENAI_REQUEST_TIMEOUT = 180.0


async def generate(
    *,
    prompt: str,
    image_bytes: bytes,
    cfg: ProviderConfig,
) -> tuple[bytes, int, str]:
    """Edit `image_bytes` via the configured OpenAI image model.

    Returns (bytes, duration_ms, model). Echoes source bytes when no key —
    keeps the UI flow running in mock mode.
    """
    started = time.monotonic()

    if not cfg.openai_image_configured:
        duration = int((time.monotonic() - started) * 1000)
        return image_bytes, duration, "mock/echo"

    # /images/edits requires PNG. Re-encode JPEG → PNG in memory.
    png_bytes = _to_png(image_bytes)

    headers = {"Authorization": f"Bearer {cfg.openai_key}"}
    files = {
        "image": ("source.png", png_bytes, "image/png"),
    }
    data = {
        "model": cfg.openai_image_model,
        "prompt": prompt,
        "size": OPENAI_IMAGE_SIZE,
        "quality": OPENAI_IMAGE_QUALITY,
        # b64_json removes the second fetch step + 1-hour url expiry
        "response_format": "b64_json",
        "n": "1",
    }

    async with httpx.AsyncClient(timeout=OPENAI_REQUEST_TIMEOUT) as client:
        resp = await client.post(
            f"{OPENAI_BASE_URL}/images/edits",
            headers=headers,
            files=files,
            data=data,
        )
        if resp.status_code >= 400:
            logger.warning(
                "openai images.edit %s: %s", resp.status_code, resp.text[:300]
            )
            resp.raise_for_status()
        payload = resp.json()

    items = payload.get("data") or []
    if not items:
        raise RuntimeError(f"OpenAI returned no images: {payload}")
    item = items[0]
    b64 = item.get("b64_json")
    if not b64:
        # Some response variants return a URL — fetch it
        url = item.get("url")
        if not url:
            raise RuntimeError(f"OpenAI returned no image data: {item}")
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            out_bytes = r.content
    else:
        out_bytes = base64.b64decode(b64)

    # Re-encode PNG → JPEG for smaller serving (we serve from local fs)
    out_jpeg = _to_jpeg(out_bytes)

    duration = int((time.monotonic() - started) * 1000)
    return out_jpeg, duration, cfg.openai_image_model


def _to_png(raw: bytes) -> bytes:
    """Decode any supported source bytes and re-encode as PNG."""
    with Image.open(io.BytesIO(raw)) as im:
        im = im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, format="PNG", optimize=False)
        return buf.getvalue()


def _to_jpeg(raw: bytes) -> bytes:
    with Image.open(io.BytesIO(raw)) as im:
        im = im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=92, optimize=True)
        return buf.getvalue()
