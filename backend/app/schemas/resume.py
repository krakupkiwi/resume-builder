from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ResumeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    job_title_target: str | None = None
    job_description: str | None = None
    template_name: str = "classic"
    sections_order: list[str] = ["summary", "experience", "skills", "education"]
    sections_config: dict[str, Any] = {}
    selected_experience_ids: list[str] = []
    custom_summary: str | None = None
    skills_selection: dict[str, Any] = {}
    style_config: dict[str, Any] = {}
    is_base: bool = False


class ResumeUpdate(BaseModel):
    name: str | None = None
    job_title_target: str | None = None
    job_description: str | None = None
    template_name: str | None = None
    sections_order: list[str] | None = None
    sections_config: dict[str, Any] | None = None
    selected_experience_ids: list[str] | None = None
    custom_summary: str | None = None
    skills_selection: dict[str, Any] | None = None
    gap_analysis_result: dict[str, Any] | None = None
    style_config: dict[str, Any] | None = None
    is_base: bool | None = None


class ResumeResponse(BaseModel):
    id: str
    profile_id: str
    name: str
    job_title_target: str | None
    job_description: str | None
    template_name: str
    sections_order: list[str]
    sections_config: dict
    selected_experience_ids: list[str]
    custom_summary: str | None
    skills_selection: dict
    gap_analysis_result: dict | None
    style_config: dict
    is_base: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeBulletCreate(BaseModel):
    experience_entry_id: str
    original_bullet_id: str
    display_text: str
    is_ai_rewritten: bool = False
    ai_rationale: str | None = None
    position: int = 0


class ResumeBulletUpdate(BaseModel):
    display_text: str | None = None
    is_ai_rewritten: bool | None = None
    ai_rationale: str | None = None
    position: int | None = None


class ResumeBulletResponse(BaseModel):
    id: str
    resume_version_id: str
    experience_entry_id: str
    original_bullet_id: str
    display_text: str
    is_ai_rewritten: bool
    ai_rationale: str | None
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
