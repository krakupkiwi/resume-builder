from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class JobApplicationCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    job_title: str = Field(..., min_length=1, max_length=255)
    job_url: str | None = None
    job_description: str | None = None
    salary_range: str | None = None
    location: str | None = None
    remote_type: str | None = None
    resume_version_id: str | None = None
    status: str = "saved"
    applied_at: str | None = None
    notes: str | None = None
    contacts: list[dict[str, Any]] = []


class JobApplicationUpdate(BaseModel):
    company_name: str | None = None
    job_title: str | None = None
    job_url: str | None = None
    job_description: str | None = None
    salary_range: str | None = None
    location: str | None = None
    remote_type: str | None = None
    resume_version_id: str | None = None
    status: str | None = None
    applied_at: str | None = None
    notes: str | None = None
    contacts: list[dict[str, Any]] | None = None


class StatusUpdate(BaseModel):
    status: str
    notes: str | None = None


class JobApplicationResponse(BaseModel):
    id: str
    profile_id: str
    resume_version_id: str | None
    company_name: str
    job_title: str
    job_url: str | None
    job_description: str | None
    salary_range: str | None
    location: str | None
    remote_type: str | None
    status: str
    status_history: list[dict]
    applied_at: str | None
    notes: str | None
    contacts: list[dict]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
