from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.user_profile import UserProfile
    from app.models.experience import ExperienceEntry
    from app.models.job_application import JobApplication
    from app.models.document import GeneratedDocument
    from app.models.cover_letter import CoverLetter


class ResumeVersion(Base, TimestampMixin):
    """A tailored resume version for a specific job or purpose."""

    __tablename__ = "resume_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_title_target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_name: Mapped[str] = mapped_column(String(50), default="classic")

    # Ordered list of section names: ["summary","experience","skills","education"]
    sections_order: Mapped[list] = mapped_column(JSON, default=lambda: ["summary", "experience", "skills", "education"])

    # Per-section show/hide + custom titles: {"experience": {"visible": true, "title": "Work History"}}
    sections_config: Mapped[dict] = mapped_column(JSON, default=dict)

    # Which experience entry IDs to include (ordered)
    selected_experience_ids: Mapped[list] = mapped_column(JSON, default=list)

    custom_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills_selection: Mapped[dict] = mapped_column(JSON, default=dict)  # {"selected": [...], "order": [...]}
    gap_analysis_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_base: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    profile: Mapped["UserProfile"] = relationship("UserProfile", back_populates="resume_versions")
    bullets: Mapped[list["ResumeBullet"]] = relationship(
        "ResumeBullet", back_populates="resume_version", cascade="all, delete-orphan"
    )
    job_applications: Mapped[list["JobApplication"]] = relationship(
        "JobApplication", back_populates="resume_version"
    )
    generated_documents: Mapped[list["GeneratedDocument"]] = relationship(
        "GeneratedDocument", back_populates="resume_version", cascade="all, delete-orphan"
    )
    cover_letters: Mapped[list["CoverLetter"]] = relationship(
        "CoverLetter", back_populates="resume_version"
    )


class ResumeBullet(Base, TimestampMixin):
    """Per-version override for a specific bullet point. Tracks AI rewrites."""

    __tablename__ = "resume_bullets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    resume_version_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=False
    )
    experience_entry_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("experience_entries.id", ondelete="CASCADE"), nullable=False
    )
    original_bullet_id: Mapped[str] = mapped_column(String(36), nullable=False)
    display_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_ai_rewritten: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    resume_version: Mapped["ResumeVersion"] = relationship("ResumeVersion", back_populates="bullets")
    experience_entry: Mapped["ExperienceEntry"] = relationship("ExperienceEntry", back_populates="resume_bullets")
