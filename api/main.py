"""PoseLab FastAPI entrypoint.

Routes:
  GET  /                          service info
  GET  /health                    liveness
  GET  /whoami                    identity introspection
  POST /upload                    accept photo, return image_url
  GET  /uploads/<file>            serve uploaded originals (StaticFiles mount)
  GET  /enhanced/<file>           serve fal.ai / OpenAI image outputs
  POST /analyze                   mode=suggest | prompt
  POST /generate                  in-app image generation (paid tier)
  GET  /share/<slug>              fetch public share data
  DELETE /share/<slug>            owner / anon-creator takedown
"""

from __future__ import annotations

# IMPORTANT: load .env BEFORE any of our own modules that read env at import
# time (ai.py, fal.py, storage.py, ratelimit.py all do this).
from dotenv import load_dotenv

load_dotenv()

import logging
import os
from typing import Any

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import ai
import db
import fal
import knowledge
import openai_image
import prompts
import ratelimit
from auth import Identity, identify
from providers import ProviderConfig, get_provider_config, safe_repr
from models import (
    AnalyzeResponse,
    GenerateRequest,
    GenerateResponse,
    PromptData,
    PublicShareData,
    ShareResponse,
    SuggestData,
    Suggestions,
    Usage,
    UploadResponse,
)
from storage import ENHANCED_DIR, UPLOADS_DIR, get_storage

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("poselab")

app = FastAPI(
    title="PoseLab API",
    version="0.3.0",
    description="Photo enhancement prompt generator + fal.ai image generation.",
)

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:3030,http://127.0.0.1:3000,http://127.0.0.1:3030",
    ).split(",")
    if o.strip()
]

# Safety: `*` + allow_credentials is a catastrophic CORS misconfiguration —
# any origin can make credentialed requests on the user's behalf. Reject
# explicitly rather than letting the browser silently accept.
if "*" in ALLOWED_ORIGINS:
    logger_pre = logging.getLogger("poselab.cors")  # logger not yet created
    logger_pre.warning(
        "CORS_ALLOWED_ORIGINS contains '*' — stripping it because "
        "allow_credentials=True. Set explicit origins instead."
    )
    ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    # Explicit allow-list of custom headers the client sends — strict-ish.
    # Note: "*" with credentials is rejected by browsers anyway.
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Anon-Id",
        "ngrok-skip-browser-warning",
        # BYOK provider config headers — see providers.py
        "X-AI-Base-URL",
        "X-AI-Key",
        "X-AI-Vision-Model",
        "X-AI-Text-Model",
        "X-Image-Provider",
        "X-OpenAI-Key",
        "X-OpenAI-Image-Model",
        "X-Fal-Key",
        "X-Fal-Model",
    ],
)

# Public sharing surface — uploaded originals and enhanced outputs both served
# directly. In production behind CDN this becomes Supabase Storage URLs.
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/enhanced", StaticFiles(directory=str(ENHANCED_DIR)), name="enhanced")


# ──────────────────────────────────────────────────────────────────────────────
# Health & identity
# ──────────────────────────────────────────────────────────────────────────────


@app.get("/")
def root():
    return {
        "service": "poselab-api",
        "version": app.version,
        "status": "ok",
    }


@app.get("/config")
def server_config(
    cfg: ProviderConfig = Depends(get_provider_config),
):
    """Tells the frontend what's available with the keys the request carries.

    The frontend uses this for the first-run modal: if none of the keys are
    configured (neither via headers nor server env), prompt the user to add
    their own. This is the heart of the BYOK flow.

    Never returns the actual keys — only booleans.
    """
    return {
        "service": "poselab-api",
        "version": app.version,
        "ai_configured": cfg.ai_configured,
        "openai_image_configured": cfg.openai_image_configured,
        "fal_configured": cfg.fal_configured,
        "active_image_provider": cfg.resolved_image_provider(),
        "ai_base_url": cfg.ai_base_url,
        "vision_model": cfg.vision_model,
        "text_model": cfg.text_model,
        "openai_image_model": cfg.openai_image_model,
        "fal_model": cfg.fal_model,
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/whoami")
def whoami(identity: Identity = Depends(identify)):
    return {
        "kind": identity.kind,
        "user_id": identity.user_id,
        "email": identity.email,
        "anon_id": identity.anon_id,
    }


# ──────────────────────────────────────────────────────────────────────────────
# /upload
# ──────────────────────────────────────────────────────────────────────────────


MAX_UPLOAD_BYTES = 12 * 1024 * 1024  # 12 MB
ALLOWED_MIME_PREFIX = "image/"

# Image IDs and slugs are server-minted. We hard-validate before using them in
# any filesystem path or DB key — defense against path-traversal and key
# injection. These regexes match exactly what storage.py / db.py generates.
import re

_IMAGE_ID_RE = re.compile(r"^[a-f0-9]{32}$")
_ENHANCED_ID_RE = re.compile(r"^[a-f0-9]{32}-enh-[a-f0-9]{6}$")
_SLUG_RE = re.compile(r"^[a-z0-9]{8}$")


def _validate_image_id(image_id: str) -> str:
    """Reject any image_id that isn't the exact shape storage.py mints.

    Without this, a request like image_id='../etc/passwd' could read outside
    the uploads dir.
    """
    if not _IMAGE_ID_RE.match(image_id or ""):
        raise HTTPException(status_code=400, detail="Invalid image_id format")
    return image_id


def _source_id_from_image_url(image_url: str) -> str:
    """Extract the source image id from a user-supplied image URL, then
    validate it. Used by /generate which historically derived the id from
    the URL the frontend echoes back.
    """
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url required")
    last = image_url.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    return _validate_image_id(last)


def _validate_slug(slug: str) -> str:
    if not _SLUG_RE.match(slug or ""):
        raise HTTPException(status_code=400, detail="Invalid slug")
    return slug


@app.post("/upload", response_model=UploadResponse)
async def upload_image(
    image: UploadFile = File(...),
):
    """Accept a single image, normalize (EXIF strip + resize), persist, return URL."""
    if not image.content_type or not image.content_type.startswith(ALLOWED_MIME_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image uploads are accepted",
        )
    raw = await image.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large (max 12 MB)",
        )
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        image_id, image_url = await get_storage().save_upload(
            raw, image.filename or "upload.jpg"
        )
    except Exception as exc:
        logger.exception("upload failed")
        raise HTTPException(status_code=500, detail="Could not save image") from exc

    return UploadResponse(image_id=image_id, image_url=image_url)


# ──────────────────────────────────────────────────────────────────────────────
# /analyze (mode=suggest | mode=prompt)
# ──────────────────────────────────────────────────────────────────────────────


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: Request,
    mode: str = Form(...),
    image_id: str | None = Form(default=None),
    image_url: str | None = Form(default=None),
    pose: str | None = Form(default=None),
    background: str | None = Form(default=None),
    lighting: str | None = Form(default=None),
    style: str | None = Form(default=None),
    focus: str | None = Form(default=None),
    freetext: str | None = Form(default=None),
    scenario_in: str | None = Form(default=None, alias="scenario"),
    # Repeated form field: `issues=...&issues=...` from the frontend.
    issues: list[str] | None = Form(default=None),
    identity: Identity = Depends(identify),
    cfg: ProviderConfig = Depends(get_provider_config),
):
    plan = "paid" if identity.kind == "user" else "free"
    decision = await ratelimit.check_and_bump_analyze(
        user_id=identity.user_id, anon_id=identity.anon_id, plan=plan
    )
    if not decision.allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "ok": False,
                "error": "rate_limit",
                "message": (
                    "Daily free limit reached. Sign in and upgrade for unlimited."
                ),
            },
        )

    usage = Usage(
        count_today=decision.count_today,
        limit=decision.limit,
        plan=plan,
    )

    if mode == "suggest":
        if not image_id:
            raise HTTPException(400, "image_id is required for mode=suggest")
        _validate_image_id(image_id)
        try:
            raw = await get_storage().read_upload(image_id)
        except FileNotFoundError:
            raise HTTPException(404, "image not found")

        # Stage 1: detect scenario (cheap classification call)
        try:
            detected_scenario, scenario_reasoning = await ai.detect_scenario(
                raw, prompts.DETECT_SCENARIO_PROMPT, cfg
            )
        except Exception:
            logger.exception("scenario detection failed; defaulting to 'other'")
            detected_scenario, scenario_reasoning = (
                "other",
                "detection failed; defaulted",
            )

        # Stage 2: critique with the relevant tradition's KB embedded
        critique_prompt = prompts.build_critique_prompt(detected_scenario)  # type: ignore[arg-type]
        try:
            result = await ai.suggest_from_image(raw, critique_prompt, cfg)
        except Exception:
            logger.exception("AI critique failed")
            # Refund the rate-limit credit since the call didn't succeed.
            await ratelimit.refund_analyze(
                user_id=identity.user_id, anon_id=identity.anon_id
            )
            return JSONResponse(
                status_code=status.HTTP_502_BAD_GATEWAY,
                content={
                    "ok": False,
                    "error": "ai_failed",
                    "message": (
                        "AI provider rejected the call. Check your API key + "
                        "model in Settings, or set OPENROUTER_API_KEY on the server."
                    ),
                },
            )

        # Pull the lineage names from the KB for transparency ("analyzed as
        # portrait through the lens of Leibovitz, Avedon, Lindbergh, Karsh")
        kb_entry = knowledge.KB.get(detected_scenario, knowledge.KB["other"])  # type: ignore[arg-type]
        tradition = [p.name for p in kb_entry.lineage]

        data = SuggestData(
            scene_detected=result["scene_detected"],
            issues=result["issues"],
            suggestions=Suggestions(**result["suggestions"]),
            scenario=detected_scenario,
            scenario_reasoning=scenario_reasoning,
            tradition=tradition,
        )

        # Persist with the scenario so mode=prompt can reuse it
        analysis_id = await db.insert_analysis(
            user_id=identity.user_id,
            anon_id=identity.anon_id,
            mode="suggest",
            input_image_url=image_url,
            output_data={
                "scene_detected": data.scene_detected,
                "issues": data.issues,
                "suggestions": data.suggestions.model_dump(),
                "scenario": detected_scenario,
                "scenario_reasoning": scenario_reasoning,
                "tradition": tradition,
            },
        )
        return JSONResponse(
            content={
                "ok": True,
                "mode": "suggest",
                "data": {
                    **data.model_dump(),
                    "analysis_id": analysis_id,
                },
                "usage": usage.model_dump(),
            }
        )

    if mode == "prompt":
        if not image_id:
            raise HTTPException(400, "image_id is required for mode=prompt")
        _validate_image_id(image_id)

        # Reuse the scenario the frontend got back from suggest. Fall back to
        # "other" if missing or unrecognized — the prompt still composes fine.
        scenario_clean = (scenario_in or "").strip().lower()
        if scenario_clean not in knowledge.KB:
            scenario_clean = "other"

        system = prompts.build_prompt_system(
            scenario=scenario_clean,  # type: ignore[arg-type]
            pose=pose or "",
            background=background or "",
            lighting=lighting or "",
            style=style or "",
            focus=focus or "",
            freetext=freetext or "",
            issues=tuple(issues or ()),
        )
        try:
            result = await ai.prompt_from_choices(system, cfg)
        except Exception:
            logger.exception("AI prompt failed")
            await ratelimit.refund_analyze(
                user_id=identity.user_id, anon_id=identity.anon_id
            )
            return JSONResponse(
                status_code=status.HTTP_502_BAD_GATEWAY,
                content={
                    "ok": False,
                    "error": "ai_failed",
                    "message": (
                        "AI provider rejected the call. Check your API key + "
                        "model in Settings, or set OPENROUTER_API_KEY on the server."
                    ),
                },
            )

        # Persist + create a default public share so the frontend gets a URL
        analysis_id = await db.insert_analysis(
            user_id=identity.user_id,
            anon_id=identity.anon_id,
            mode="prompt",
            input_image_url=image_url,
            output_data={
                "prompt": result["prompt"],
                "alt_prompts": result["alt_prompts"],
                "final_form": {
                    "pose": pose,
                    "background": background,
                    "lighting": lighting,
                    "style": style,
                    "focus": focus,
                    "freetext": freetext,
                },
                "image_id": image_id,
                "image_url": image_url,
            },
        )
        slug = await db.create_share(
            analysis_id=analysis_id,
            user_id=identity.user_id,
            is_public=True,
            face_blur=False,
        )
        web_base = os.getenv("WEB_BASE_URL", "http://localhost:3030")
        public_url = f"{web_base}/p/{slug}"

        data = PromptData(
            prompt=result["prompt"],
            alt_prompts=result["alt_prompts"],
            public_url=public_url,
            analysis_id=analysis_id,
        )
        return AnalyzeResponse(mode="prompt", data=data, usage=usage)

    raise HTTPException(400, f"Unknown mode: {mode}")


# ──────────────────────────────────────────────────────────────────────────────
# /generate (paid)
# ──────────────────────────────────────────────────────────────────────────────


@app.post("/generate", response_model=GenerateResponse)
async def generate(
    body: GenerateRequest,
    identity: Identity = Depends(identify),
    cfg: ProviderConfig = Depends(get_provider_config),
):
    plan = "paid" if identity.kind == "user" else "free"
    decision = await ratelimit.check_generate(plan=plan)
    if not decision.allowed:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "ok": False,
                "error": "paid_required",
                "message": "In-app image generation is a paid feature. Sign up to unlock.",
            },
        )

    # Derive source image id from the URL and validate. Catches both
    # path-traversal attempts and malformed URLs.
    source_id = _source_id_from_image_url(body.image_url)
    try:
        source_bytes = await get_storage().read_upload(source_id)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404, detail="Source image not found on server"
        ) from exc

    provider = cfg.resolved_image_provider()
    try:
        if provider == "fal":
            raw, duration_ms, model_id = await fal.generate(
                prompt=body.prompt, image_bytes=source_bytes, cfg=cfg
            )
        else:
            raw, duration_ms, model_id = await openai_image.generate(
                prompt=body.prompt, image_bytes=source_bytes, cfg=cfg
            )
    except Exception as exc:
        logger.exception(
            "generate failed (provider=%s, cfg=%s)", provider, safe_repr(cfg)
        )
        raise HTTPException(
            status_code=502,
            detail=(
                f"Image generation failed via {provider}. "
                "Check your API key + model in Settings."
            ),
        ) from exc

    _, enhanced_url = await get_storage().save_enhanced(raw, source_id)

    if body.analysis_id:
        await db.update_analysis_output(
            body.analysis_id,
            {"enhanced_url": enhanced_url, "fal_model": model_id},
        )

    return GenerateResponse(
        data={
            "enhanced_url": enhanced_url,
            "model": model_id,
            "duration_ms": duration_ms,
        },
        usage={
            "count_today": 0,
            "limit": decision.limit,
            "plan": plan,
        },
    )


# ──────────────────────────────────────────────────────────────────────────────
# /share
# ──────────────────────────────────────────────────────────────────────────────


@app.get("/share/{slug}", response_model=ShareResponse)
async def get_share(slug: str):
    _validate_slug(slug)
    share = await db.get_share(slug)
    if not share or not share.get("is_public", True):
        raise HTTPException(404, "Share not found")
    analysis = await db.get_analysis(share["analysis_id"])
    if not analysis:
        raise HTTPException(404, "Underlying analysis missing")

    out: dict[str, Any] = analysis.get("output_data") or {}
    suggestions_dict = out.get("suggestions")
    suggestions_obj = (
        Suggestions(**suggestions_dict) if isinstance(suggestions_dict, dict) else None
    )

    return ShareResponse(
        data=PublicShareData(
            slug=slug,
            image_url=out.get("image_url") or analysis.get("input_image_url") or "",
            enhanced_url=out.get("enhanced_url"),
            prompt=out.get("prompt") or "",
            issues=out.get("issues") or [],
            suggestions=suggestions_obj,
            final_form=out.get("final_form"),
            is_paid=bool(analysis.get("user_id")),
            face_blur=bool(share.get("face_blur")),
            created_at=share.get("created_at", ""),
        )
    )


@app.delete("/share/{slug}")
async def delete_share(slug: str, identity: Identity = Depends(identify)):
    """Takedown a share.

    Authorization model:
      - If the share has a `user_id`: only that signed-in user can delete it.
      - If the share is anonymous (no `user_id`): only the original anon
        creator can delete — matched by `anon_id` on the share row vs the
        request's identity.anon_id.
      - No `X-Anon-Id` header on an anonymous share → 403.

    This closes the audit finding "anyone with a slug can delete anon shares".
    """
    _validate_slug(slug)
    ok = await db.delete_share(
        slug, user_id=identity.user_id, anon_id=identity.anon_id
    )
    if not ok:
        raise HTTPException(404, "Share not found or not yours")
    return {"ok": True}
