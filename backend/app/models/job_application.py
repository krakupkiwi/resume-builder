from typing import TYPE_CHECKING

from sqlalchemy import JSON, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.user_profile import UserProfile
    from app.models.resume import ResumeVersion
    from app.models.cover_letter import CoverLetter


class JobApplication(Base, TimestampMixin):
    """Tracks a job application from initial targeting through to outcome."""

    __tablename__ = "job_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    resume_version_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_title: Mapped[str] = mapped_column(String(255), nullable=False)
    job_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    salary_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remote_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # remote | hybrid | onsite

    # Status: applied | phone_screen | interview | offer | rejected | withdrawn | saved
    status: Mapped[str] = mapped_column(String(30), default="saved")

    # List of {status, timestamp, notes}
    status_history: Mapped[list] = mapped_column(JSON, default=list)

    applied_at: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ISO date string
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # List of {name, role, email, linkedin}
    contacts: Mapped[list] = mapped_column(JSON, default=list)

    # Relationships
    profile: Mapped["UserProfile"] = relationship("UserProfile", back_populates="job_applications")
    resume_version: Mapped["ResumeVersion | None"] = relationship(
        "ResumeVersion", back_populates="job_applications"
    )
    cover_letters: Mapped[list["CoverLetter"]] = relationship(
        "CoverLetter", back_populates="job_application", cascade="all, delete-orphan"
    )
