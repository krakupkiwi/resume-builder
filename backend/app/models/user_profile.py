from typing import TYPE_CHECKING

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.experience import ExperienceEntry
    from app.models.resume import ResumeVersion
    from app.models.job_application import JobApplication


class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    professional_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_linkedin_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    experience_entries: Mapped[list["ExperienceEntry"]] = relationship(
        "ExperienceEntry", back_populates="profile", cascade="all, delete-orphan"
    )
    resume_versions: Mapped[list["ResumeVersion"]] = relationship(
        "ResumeVersion", back_populates="profile", cascade="all, delete-orphan"
    )
    job_applications: Mapped[list["JobApplication"]] = relationship(
        "JobApplication", back_populates="profile", cascade="all, delete-orphan"
    )
