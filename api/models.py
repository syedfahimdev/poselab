"""Pydantic request/response models for the API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────────────
# /analyze responses
# ──────────────────────────────────────────────────────────────────────────────


class CategorySuggestion(BaseModel):
    """AI-generated options for a single edit category.

    `recommended` is the AI's top pick for THIS specific photo.
    `options` is a list of 4-5 dynamic alternatives the user can pick from
    (always includes 'Keep as is' as the first option).
    """

    recommended: str
    options: list[str]


class Suggestions(BaseModel):
    pose: CategorySuggestion
    background: CategorySuggestion
    lighting: CategorySuggestion
    style: CategorySuggestion
    focus: CategorySuggestion


class SuggestData(BaseModel):
    scene_detected: str
    issues: list[str]
    suggestions: Suggestions
    scenario: str = "other"
    scenario_reasoning: str = ""
    tradition: list[str] = []  # photographer names this analysis drew from


class PromptData(BaseModel):
    prompt: str
    alt_prompts: list[str]
    public_url: str | None = None
    analysis_id: str


class Usage(BaseModel):
    count_today: int
    limit: int
    plan: Literal["free", "paid"]


class AnalyzeResponse(BaseModel):
    ok: bool = True
    mode: Literal["suggest", "prompt"]
    data: SuggestData | PromptData
    usage: Usage


# ──────────────────────────────────────────────────────────────────────────────
# /generate
# ──────────────────────────────────────────────────────────────────────────────


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    image_url: str
    analysis_id: str | None = None


class GenerateData(BaseModel):
    enhanced_url: str
    model: str
    duration_ms: int


class GenerateResponse(BaseModel):
    ok: bool = True
    data: GenerateData
    usage: Usage


# ──────────────────────────────────────────────────────────────────────────────
# /upload
# ──────────────────────────────────────────────────────────────────────────────


class UploadResponse(BaseModel):
    ok: bool = True
    image_url: str
    image_id: str


# ──────────────────────────────────────────────────────────────────────────────
# /share/[slug]
# ──────────────────────────────────────────────────────────────────────────────


class PublicShareData(BaseModel):
    slug: str
    image_url: str
    enhanced_url: str | None = None
    prompt: str
    issues: list[str] = []
    suggestions: Suggestions | None = None
    final_form: dict | None = None
    is_paid: bool = False
    face_blur: bool = False
    created_at: str


class ShareResponse(BaseModel):
    ok: bool = True
    data: PublicShareData


# ──────────────────────────────────────────────────────────────────────────────
# Error envelope
# ──────────────────────────────────────────────────────────────────────────────


class ErrorResponse(BaseModel):
    ok: bool = False
    error: str
    message: str
