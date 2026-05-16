"""fal.ai adapter for image generation (FLUX Pro Kontext by default).

Uses the queue API (https://queue.fal.run/<model>): submit, poll, download.
Source image is sent as a base64 data URL so fal's servers don't need to
reach back to ours (sidesteps Tailscale / localhost / private-VPC issues).

When no key is configured, echoes the source image so the UI flow still runs.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import time
from typing import Any

import httpx

from providers import ProviderConfig

logger = logging.getLogger(__name__)

FAL_BASE_URL = "https://queue.fal.run"
POLL_INTERVAL = 1.0
POLL_TIMEOUT = 120.0


async def generate(
    *,
    prompt: str,
    image_bytes: bytes,
    cfg: ProviderConfig,
) -> tuple[bytes, int, str]:
    """Generate an enhanced image. Returns (image_bytes, duration_ms, model).

    Echoes the source image if no FAL key is configured (mock mode).
    """
    started = time.monotonic()

    if not cfg.fal_configured:
        duration = int((time.monotonic() - started) * 1000)
        return image_bytes, duration, "mock/echo"

    # Encode source as data URL so fal.ai doesn't need to reach our server
    data_url = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode('ascii')}"

    enhanced_url = await _run_fal_job(prompt=prompt, image_url=data_url, cfg=cfg)

    async with httpx.AsyncClient(timeout=30.0) as client:
        img = await client.get(enhanced_url)
        img.raise_for_status()

    duration = int((time.monotonic() - started) * 1000)
    return img.content, duration, cfg.fal_model


async def _run_fal_job(*, prompt: str, image_url: str, cfg: ProviderConfig) -> str:
    headers = {
        "Authorization": f"Key {cfg.fal_key}",
        "Content-Type": "application/json",
    }
    submit_url = f"{FAL_BASE_URL}/{cfg.fal_model}"
    payload = {
        "prompt": prompt,
        "image_url": image_url,
        # Higher guidance = stick closer to the prompt. With our new
        # edit-style prompts (explicit "preserve face/identity/age/ethnicity"
        # at the front), bumping guidance to ~5.0 makes the model honor the
        # preservation language more strictly. Default 3.5 was too loose.
        "guidance_scale": 5.0,
        "num_images": 1,
        "safety_tolerance": "2",
        # Output PNG so subtle skin-texture and color grading aren't lost
        # to JPEG re-compression on the way back.
        "output_format": "jpeg",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        submit = await client.post(submit_url, headers=headers, json=payload)
        if submit.status_code >= 400:
            logger.warning("fal submit %s: %s", submit.status_code, submit.text[:200])
            submit.raise_for_status()
        job = submit.json()
        request_id = job.get("request_id")
        status_url = job.get("status_url") or f"{submit_url}/requests/{request_id}/status"
        response_url = job.get("response_url") or f"{submit_url}/requests/{request_id}"

        # Poll
        deadline = time.monotonic() + POLL_TIMEOUT
        while time.monotonic() < deadline:
            await asyncio.sleep(POLL_INTERVAL)
            s = await client.get(status_url, headers=headers)
            if s.status_code >= 400:
                logger.warning("fal status %s: %s", s.status_code, s.text[:200])
                s.raise_for_status()
            sd = s.json()
            if sd.get("status") == "COMPLETED":
                break
            if sd.get("status") in ("FAILED", "CANCELED"):
                raise RuntimeError(f"fal job {sd.get('status')}: {sd}")
        else:
            raise TimeoutError("fal job did not finish within timeout")

        final = await client.get(response_url, headers=headers)
        final.raise_for_status()
        result: dict[str, Any] = final.json()

    images = result.get("images") or []
    if not images:
        raise RuntimeError(f"fal returned no images: {result}")
    return images[0]["url"]
