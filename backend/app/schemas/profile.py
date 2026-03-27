from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class ProfileCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None
    professional_summary: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None
    professional_summary: str | None = None


class ProfileResponse(BaseModel):
    id: str
    full_name: str
    email: str | None
    phone: str | None
    location: str | None
    linkedin_url: str | None
    website_url: str | None
    professional_summary: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
