from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CoverLetterCreate(BaseModel):
    job_application_id: str
    resume_version_id: str | None = None
    body_html: str = ""
    body_plain: str = ""
    tone: Literal["professional", "conversational", "enthusiastic"] = "professional"


class CoverLetterUpdate(BaseModel):
    body_html: str | None = None
    body_plain: str | None = None
    tone: str | None = None


class CoverLetterGenerateRequest(BaseModel):
    job_application_id: str
    resume_version_id: str | None = None
    tone: Literal["professional", "conversational", "enthusiastic"] = "professional"
    additional_notes: str | None = None


class CoverLetterResponse(BaseModel):
    id: str
    job_application_id: str
    resume_version_id: str | None
    body_html: str
    body_plain: str
    tone: str
    is_ai_generated: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
