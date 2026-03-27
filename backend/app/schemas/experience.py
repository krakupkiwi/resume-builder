import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class BulletEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    is_quantified: bool = False
    tags: list[str] = []
    source: Literal["original", "ai_suggested", "user_edited"] = "original"


class ExperienceCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    job_title: str = Field(..., min_length=1, max_length=255)
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool = False
    location: str | None = None
    employment_type: str | None = None
    raw_description: str | None = None
    bullets: list[BulletEntry] = []
    skills_demonstrated: list[str] = []
    industries: list[str] = []
    impact_metrics: dict[str, Any] | None = None
    source: str = "manual"
    sort_order: int = 0


class ExperienceUpdate(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool | None = None
    location: str | None = None
    employment_type: str | None = None
    raw_description: str | None = None
    bullets: list[BulletEntry] | None = None
    skills_demonstrated: list[str] | None = None
    industries: list[str] | None = None
    impact_metrics: dict[str, Any] | None = None
    sort_order: int | None = None


class ExperienceResponse(BaseModel):
    id: str
    profile_id: str
    company_name: str
    job_title: str
    start_date: str | None
    end_date: str | None
    is_current: bool
    location: str | None
    employment_type: str | None
    raw_description: str | None
    bullets: list[dict]
    skills_demonstrated: list[str]
    industries: list[str]
    impact_metrics: dict | None
    source: str
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
