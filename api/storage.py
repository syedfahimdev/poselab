"""File storage abstraction.

Two backends:
  LocalStorage     — files in api/data/uploads/ and api/data/enhanced/, served
                     by FastAPI at /uploads/<id> and /enhanced/<id>.
  SupabaseStorage  — (future) writes to Supabase Storage buckets.

The active backend is chosen by `STORAGE_BACKEND` env var (defaults to local).

EXIF is stripped on every upload — required for the public-share guardrails.
"""

from __future__ import annotations

import io
import os
import re
import uuid
from pathlib import Path
from typing import Protocol

# Validates image IDs minted by save_upload (uuid4 hex). Used by read_upload
# to reject anything with traversal characters.
_IMAGE_ID_RE = re.compile(r"^[a-f0-9]{32}$")


def _IS_VALID_IMAGE_ID(image_id: str) -> bool:
    return bool(image_id and _IMAGE_ID_RE.match(image_id))

from PIL import Image, ImageOps

# Register HEIC/HEIF support so iPhone photos (uploaded as .heic by default)
# open transparently through Image.open(). Side-effect import — call once.
try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    # Optional dependency; HEIC uploads will fail with a clear error if missing
    pass

# Root of the persisted data directory (created on import)
DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).parent / "data"))
UPLOADS_DIR = DATA_DIR / "uploads"
ENHANCED_DIR = DATA_DIR / "enhanced"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ENHANCED_DIR.mkdir(parents=True, exist_ok=True)

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


class Storage(Protocol):
    async def save_upload(self, raw: bytes, original_name: str) -> tuple[str, str]:
        """Save user-uploaded photo. Returns (image_id, public_url)."""

    async def save_enhanced(self, raw: bytes, source_id: str) -> tuple[str, str]:
        """Save fal.ai-generated enhanced photo. Returns (image_id, public_url)."""

    async def read_upload(self, image_id: str) -> bytes:
        """Read raw bytes for an uploaded image (used to send to vision API)."""


class LocalStorage:
    """Files on local disk, served by FastAPI static mounts."""

    async def save_upload(self, raw: bytes, original_name: str) -> tuple[str, str]:
        image_id, normalized = _normalize_image(raw, original_name)
        path = UPLOADS_DIR / f"{image_id}.jpg"
        path.write_bytes(normalized)
        return image_id, f"{API_BASE_URL}/uploads/{image_id}.jpg"

    async def save_enhanced(self, raw: bytes, source_id: str) -> tuple[str, str]:
        image_id = f"{source_id}-enh-{uuid.uuid4().hex[:6]}"
        path = ENHANCED_DIR / f"{image_id}.jpg"
        # No EXIF strip needed — these are AI-generated.
        path.write_bytes(raw)
        return image_id, f"{API_BASE_URL}/enhanced/{image_id}.jpg"

    async def read_upload(self, image_id: str) -> bytes:
        # Defense in depth: storage.py shouldn't have to trust main.py's
        # validation. Reject anything that's not the exact 32-hex shape that
        # save_upload mints — closes path-traversal even if a caller
        # forgets to pre-validate.
        if not _IS_VALID_IMAGE_ID(image_id):
            raise FileNotFoundError(f"invalid image_id: {image_id!r}")
        path = UPLOADS_DIR / f"{image_id}.jpg"
        # Resolve and re-check the prefix as a belt-and-braces check
        resolved = path.resolve()
        if not str(resolved).startswith(str(UPLOADS_DIR.resolve())):
            raise FileNotFoundError(f"path escapes uploads dir: {image_id!r}")
        if not resolved.exists():
            raise FileNotFoundError(image_id)
        return resolved.read_bytes()


# ──────────────────────────────────────────────────────────────────────────────
# helpers
# ──────────────────────────────────────────────────────────────────────────────


MAX_DIMENSION = 2048
JPEG_QUALITY = 88


def _normalize_image(raw: bytes, _original_name: str) -> tuple[str, bytes]:
    """Strip EXIF, auto-rotate, downscale if needed, re-encode as JPEG.

    Returns (image_id, normalized_bytes).
    """
    image_id = uuid.uuid4().hex
    with Image.open(io.BytesIO(raw)) as im:
        # Honor EXIF orientation, then drop EXIF entirely
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        im.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return image_id, buf.getvalue()


# ──────────────────────────────────────────────────────────────────────────────
# active backend
# ──────────────────────────────────────────────────────────────────────────────


def get_storage() -> Storage:
    """Pick the configured storage backend.

    Currently only LocalStorage ships; Supabase Storage / S3 are swappable.
    """
    backend = os.getenv("STORAGE_BACKEND", "local").lower()
    if backend == "local":
        return LocalStorage()
    # Future: if backend == "supabase": return SupabaseStorage()
    return LocalStorage()
