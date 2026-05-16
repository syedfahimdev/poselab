"""Tiny persistence layer.

JSON-file backed (atomic writes + asyncio.Lock). Good for solo / small
deployments. Swap to Supabase / Postgres for production scale — only this
module needs to change.

Stored collections:
  - analyses           (insert, get-by-id)
  - public_shares      (insert, get-by-slug, delete-by-slug)
  - daily_usage        (per-user counters)
  - daily_usage_anon   (per-anon-id counters)
"""

from __future__ import annotations

import asyncio
import json
import os
import secrets
import string
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).parent / "data"))
DB_DIR = DATA_DIR / "db"
DB_DIR.mkdir(parents=True, exist_ok=True)


def _path(name: str) -> Path:
    return DB_DIR / f"{name}.json"


def _load(name: str) -> dict[str, Any]:
    p = _path(name)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text() or "{}")
    except json.JSONDecodeError:
        # Corrupted JSON — return empty rather than crash. The atomic-write
        # below makes this scenario unlikely going forward.
        return {}


def _save(name: str, data: dict[str, Any]) -> None:
    """Atomic write: serialize to a sibling .tmp then os.replace into place.

    Replaces the previous `Path.write_text` which truncated then wrote — a
    crash mid-write would leave an empty file (permanent data loss).
    """
    target = _path(name)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_text(json.dumps(data, default=str, indent=2))
    # os.replace is atomic on POSIX and atomic-enough on Windows
    os.replace(tmp, target)


# Serialize all writes to avoid concurrent corruption (single-process safe)
_lock = asyncio.Lock()

# ──────────────────────────────────────────────────────────────────────────────
# analyses
# ──────────────────────────────────────────────────────────────────────────────


async def insert_analysis(
    *,
    user_id: str | None,
    anon_id: str | None,
    mode: str,
    input_image_url: str | None,
    output_data: dict[str, Any],
) -> str:
    analysis_id = str(uuid.uuid4())
    row = {
        "id": analysis_id,
        "user_id": user_id,
        "anon_id": anon_id,
        "mode": mode,
        "input_image_url": input_image_url,
        "output_data": output_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    async with _lock:
        analyses = _load("analyses")
        analyses[analysis_id] = row
        _save("analyses", analyses)
    return analysis_id


async def get_analysis(analysis_id: str) -> dict[str, Any] | None:
    async with _lock:
        analyses = _load("analyses")
    return analyses.get(analysis_id)


async def update_analysis_output(analysis_id: str, patch: dict[str, Any]) -> None:
    async with _lock:
        analyses = _load("analyses")
        if analysis_id not in analyses:
            return
        analyses[analysis_id]["output_data"] = {
            **(analyses[analysis_id]["output_data"] or {}),
            **patch,
        }
        _save("analyses", analyses)


# ──────────────────────────────────────────────────────────────────────────────
# public_shares
# ──────────────────────────────────────────────────────────────────────────────


SLUG_ALPHABET = string.ascii_lowercase + string.digits


def _new_slug() -> str:
    return "".join(secrets.choice(SLUG_ALPHABET) for _ in range(8))


async def create_share(
    *,
    analysis_id: str,
    user_id: str | None,
    anon_id: str | None = None,
    is_public: bool = True,
    face_blur: bool = False,
) -> str:
    """Create a public share record. Tracks anon_id when no user_id present
    so the original creator (and ONLY them) can take it down later."""
    async with _lock:
        shares = _load("public_shares")
        slug = _new_slug()
        while slug in shares:
            slug = _new_slug()
        shares[slug] = {
            "slug": slug,
            "analysis_id": analysis_id,
            "user_id": user_id,
            "anon_id": anon_id,  # used for takedown auth on anon shares
            "is_public": is_public,
            "face_blur": face_blur,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _save("public_shares", shares)
    return slug


async def get_share(slug: str) -> dict[str, Any] | None:
    async with _lock:
        shares = _load("public_shares")
    return shares.get(slug)


async def delete_share(
    slug: str,
    *,
    user_id: str | None,
    anon_id: str | None,
) -> bool:
    """Delete a share. Authorization:
      - Signed-in shares (user_id set): only matching user_id can delete.
      - Anonymous shares (user_id null): only matching anon_id can delete.
      - Missing both → reject.

    Returns True on successful delete, False if not found or unauthorized.
    """
    async with _lock:
        shares = _load("public_shares")
        row = shares.get(slug)
        if not row:
            return False
        row_user = row.get("user_id")
        row_anon = row.get("anon_id")
        if row_user:
            if not user_id or row_user != user_id:
                return False
        else:
            # Anonymous share — require anon_id match
            if not anon_id or row_anon != anon_id:
                return False
        del shares[slug]
        _save("public_shares", shares)
        return True


# ──────────────────────────────────────────────────────────────────────────────
# daily_usage (user) + daily_usage_anon
# ──────────────────────────────────────────────────────────────────────────────


def _today() -> str:
    return date.today().isoformat()


async def bump_usage(*, user_id: str | None, anon_id: str | None) -> int:
    """Increment today's counter for whichever identity is present. Returns
    the new count."""
    if not user_id and not anon_id:
        return 0

    bucket = "daily_usage" if user_id else "daily_usage_anon"
    key = f"{user_id or anon_id}:{_today()}"
    async with _lock:
        rows = _load(bucket)
        rows[key] = (rows.get(key, 0) or 0) + 1
        _save(bucket, rows)
        return rows[key]


async def read_usage(*, user_id: str | None, anon_id: str | None) -> int:
    if not user_id and not anon_id:
        return 0
    bucket = "daily_usage" if user_id else "daily_usage_anon"
    key = f"{user_id or anon_id}:{_today()}"
    async with _lock:
        rows = _load(bucket)
    return rows.get(key, 0) or 0


async def decrement_usage(*, user_id: str | None, anon_id: str | None) -> int:
    """Refund a single credit (used when an AI call fails after bumping)."""
    if not user_id and not anon_id:
        return 0
    bucket = "daily_usage" if user_id else "daily_usage_anon"
    key = f"{user_id or anon_id}:{_today()}"
    async with _lock:
        rows = _load(bucket)
        current = rows.get(key, 0) or 0
        new_count = max(0, current - 1)
        rows[key] = new_count
        _save(bucket, rows)
        return new_count
