"""Request identification: authenticated user OR anonymous UUID.

Supabase issues HS256 JWTs signed with the project's JWT secret. We verify
the signature locally (no network call to Supabase) which is fast enough to
run on every request.

For anonymous flow: the frontend sets a `poselab_anon_id` cookie or sends an
`X-Anon-Id` header. Either is accepted.

Usage in a route:

    from fastapi import Depends
    from .auth import Identity, identify

    @app.post("/analyze")
    async def analyze(identity: Identity = Depends(identify)):
        if identity.kind == "user":
            ...     # identity.user_id, identity.email
        else:
            ...     # identity.anon_id
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

import jwt
from fastapi import HTTPException, Request, status

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
# Supabase JWTs use HS256 with the JWT secret. Audience is always "authenticated"
# for signed-in users.
SUPABASE_JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")


@dataclass(frozen=True)
class Identity:
    """Result of identifying a request."""

    kind: Literal["user", "anon", "none"]
    user_id: str | None = None
    email: str | None = None
    anon_id: str | None = None

    @property
    def is_authenticated(self) -> bool:
        return self.kind == "user"


def identify(request: Request) -> Identity:
    """FastAPI dependency: identify the request as user / anon / none.

    Never raises for missing auth — returns Identity(kind="none") instead.
    Raises 401 only when an Authorization header is present but invalid (the
    caller intended to authenticate but failed).
    """
    # Try authenticated user first.
    auth_header = request.headers.get("authorization") or request.headers.get(
        "Authorization"
    )
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        user = _verify_supabase_jwt(token)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return user

    # Fall back to anonymous identifier (header takes precedence over cookie).
    anon_id = request.headers.get("x-anon-id") or request.cookies.get(
        "poselab_anon_id"
    )
    if anon_id:
        return Identity(kind="anon", anon_id=anon_id)

    return Identity(kind="none")


def require_user(request: Request) -> Identity:
    """Dependency variant that 401s on anonymous or missing auth."""
    identity = identify(request)
    if not identity.is_authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return identity


def _verify_supabase_jwt(token: str) -> Identity | None:
    # Dev-login bypass requires BOTH:
    #   1. No SUPABASE_JWT_SECRET configured (so we aren't pretending to
    #      be production-grade auth)
    #   2. Explicit opt-in via env: ALLOW_DEV_AUTH=1
    # Without (2), unknown bearer tokens are rejected — closes the audit
    # finding "misconfigured deploy fails open".
    if not SUPABASE_JWT_SECRET:
        allow_dev = os.getenv("ALLOW_DEV_AUTH", "").strip() in ("1", "true", "yes")
        if not allow_dev:
            return None
        if token.startswith("dev:"):
            email = token.removeprefix("dev:").strip() or "dev@local"
            # Light email validation — don't let "../" or whitespace pollute
            # log lines / analysis rows
            if any(c in email for c in ("\n", "\r", "\t", " ", "/", "\\")):
                return None
            if len(email) > 100:
                return None
            return Identity(
                kind="user",
                user_id=f"dev-{email}",
                email=email,
            )
        # In dev mode, any other token shape is invalid — be strict
        return None

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=SUPABASE_JWT_AUDIENCE,
            options={"require": ["sub", "exp"]},
        )
    except jwt.PyJWTError:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    return Identity(
        kind="user",
        user_id=user_id,
        email=payload.get("email"),
    )
