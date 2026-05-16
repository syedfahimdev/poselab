"""Runware.ai image-edit adapter.

Runware (https://runware.ai) is a unified inference platform that exposes
many models — including OpenAI's gpt-image-2 — through a single API. It's
typically cheaper than going direct to each provider, and the single key
covers a whole catalog of models (Flux Pro, gpt-image-2, Grok Imagine, etc.).

API contract:
  - POST  https://api.runware.ai/v1
  - Bearer auth via Authorization header
  - Body is a JSON ARRAY of task objects (not a single object!)
  - Sync — returns the result in the same response (no polling needed)
  - Source images can be base64 data URIs (preferred — sidesteps the
    "can Runware reach my server" question, same trick we use for fal.ai)

Output format options:
  - outputType: "URL" (default), "base64Data", or "dataURI"
  - outputFormat: "JPG" | "PNG" | "WEBP"
We request "base64Data" so we get the bytes back without a second fetch.

When no RUNWARE_API_KEY is configured, returns the source image unchanged
(mock mode). Pattern matches openai_image.py and fal.py.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import time
import uuid

import httpx
from PIL import Image

from providers import ProviderConfig

logger = logging.getLogger(__name__)

RUNWARE_BASE_URL = os.getenv("RUNWARE_BASE_URL", "https://api.runware.ai/v1")
RUNWARE_REQUEST_TIMEOUT = 180.0

# Default size — Runware accepts 512 to 2048 in 64-px increments.
RUNWARE_IMAGE_SIZE = os.getenv("RUNWARE_IMAGE_SIZE", "1024x1024")


async def generate(
    *,
    prompt: str,
    image_bytes: bytes,
    cfg: ProviderConfig,
) -> tuple[bytes, int, str]:
    """Edit `image_bytes` via the configured Runware model.

    Returns (bytes, duration_ms, model). Echoes the source if no key.
    """
    started = time.monotonic()

    if not cfg.runware_configured:
        duration = int((time.monotonic() - started) * 1000)
        return image_bytes, duration, "mock/echo"

    # Source as data URI — base64 with mime prefix. Saves a round trip.
    data_uri = (
        f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode('ascii')}"
    )

    width, height = _parse_size(RUNWARE_IMAGE_SIZE)

    task = {
        "taskType": "imageInference",
        "taskUUID": str(uuid.uuid4()),
        "model": cfg.runware_model,
        "positivePrompt": prompt,
        "width": width,
        "height": height,
        "numberResults": 1,
        "outputType": "base64Data",
        "outputFormat": "JPG",
        # GPT-image-2 + most edit models read the source from referenceImages
        "referenceImages": [data_uri],
        "includeCost": False,
    }
    body = [task]

    headers = {
        "Authorization": f"Bearer {cfg.runware_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=RUNWARE_REQUEST_TIMEOUT) as client:
        resp = await client.post(RUNWARE_BASE_URL, headers=headers, json=body)
        if resp.status_code >= 400:
            logger.warning(
                "runware %s: %s", resp.status_code, resp.text[:300]
            )
            resp.raise_for_status()
        payload = resp.json()

    # Response shape: { "data": [ { "taskType": "imageInference", "imageBase64Data": "..." } ], "errors": [...] }
    errors = payload.get("errors") or []
    if errors:
        msg = "; ".join(str(e.get("message") or e) for e in errors[:3])
        raise RuntimeError(f"Runware error: {msg}")

    data = payload.get("data") or []
    if not data:
        raise RuntimeError(f"Runware returned no data: {payload}")

    # Find the image-inference task result (skip auth-echo if present)
    image_b64: str | None = None
    image_url: str | None = None
    for item in data:
        if item.get("taskType") != "imageInference":
            continue
        image_b64 = item.get("imageBase64Data")
        image_url = item.get("imageURL")
        if image_b64 or image_url:
            break

    out_bytes: bytes
    if image_b64:
        out_bytes = base64.b64decode(image_b64)
    elif image_url:
        # Fallback: outputType wasn't honored; fetch the URL
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(image_url)
            r.raise_for_status()
            out_bytes = r.content
    else:
        raise RuntimeError(f"Runware returned no image data: {data}")

    # Ensure JPEG output (some models return PNG even when we asked for JPG)
    out_jpeg = _to_jpeg(out_bytes)

    duration = int((time.monotonic() - started) * 1000)
    return out_jpeg, duration, cfg.runware_model


# ─── helpers ────────────────────────────────────────────────────────────────


def _parse_size(s: str) -> tuple[int, int]:
    """Parse '1024x1024' → (1024, 1024). Falls back to 1024 square."""
    try:
        w, h = s.lower().split("x", 1)
        return (int(w), int(h))
    except (ValueError, AttributeError):
        return (1024, 1024)


def _to_jpeg(raw: bytes) -> bytes:
    """Re-encode to JPEG for consistent serving. No-op if already JPEG."""
    with Image.open(io.BytesIO(raw)) as im:
        im = im.convert("RGB")
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=92, optimize=True)
        return buf.getvalue()
