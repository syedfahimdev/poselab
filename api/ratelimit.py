"""Daily rate limits keyed by identity (user_id or anon_id).

Limits are soft caps that gate the route — when exceeded, we 429 with a
clear message and (for free users) an upgrade CTA.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import db


@dataclass(frozen=True)
class Limits:
    daily_analyze_free: int = 3       # /analyze (suggest + prompt combined)
    daily_analyze_anon: int = 3       # same cap for anonymous users
    daily_generate_free: int = 0      # paid-only feature; free gets 0
    daily_generate_paid: int = 100    # generous paid cap
    daily_analyze_paid: int = 1000    # effectively unlimited


LIMITS = Limits(
    daily_analyze_free=int(os.getenv("LIMIT_ANALYZE_FREE", "3")),
    daily_analyze_anon=int(os.getenv("LIMIT_ANALYZE_ANON", "3")),
    daily_generate_free=int(os.getenv("LIMIT_GENERATE_FREE", "0")),
    daily_generate_paid=int(os.getenv("LIMIT_GENERATE_PAID", "100")),
    daily_analyze_paid=int(os.getenv("LIMIT_ANALYZE_PAID", "1000")),
)


@dataclass(frozen=True)
class UsageDecision:
    allowed: bool
    count_today: int
    limit: int
    plan: str  # "free" | "paid"


async def check_and_bump_analyze(
    *,
    user_id: str | None,
    anon_id: str | None,
    plan: str = "free",
) -> UsageDecision:
    """Check today's analyze count for this identity; bump if allowed."""
    limit = (
        LIMITS.daily_analyze_paid
        if plan == "paid"
        else LIMITS.daily_analyze_anon
        if not user_id
        else LIMITS.daily_analyze_free
    )
    current = await db.read_usage(user_id=user_id, anon_id=anon_id)
    if current >= limit:
        return UsageDecision(
            allowed=False, count_today=current, limit=limit, plan=plan
        )
    new_count = await db.bump_usage(user_id=user_id, anon_id=anon_id)
    return UsageDecision(
        allowed=True, count_today=new_count, limit=limit, plan=plan
    )


async def check_generate(*, plan: str) -> UsageDecision:
    """Check whether the user is allowed to use /generate (paid-only)."""
    limit = (
        LIMITS.daily_generate_paid if plan == "paid" else LIMITS.daily_generate_free
    )
    allowed = limit > 0
    return UsageDecision(allowed=allowed, count_today=0, limit=limit, plan=plan)


async def refund_analyze(
    *, user_id: str | None, anon_id: str | None
) -> int:
    """Refund a credit that was consumed before an AI call failed."""
    return await db.decrement_usage(user_id=user_id, anon_id=anon_id)
