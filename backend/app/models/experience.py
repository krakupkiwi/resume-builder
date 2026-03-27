from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.user_profile import UserProfile
    from app.models.resume import ResumeBullet


class ExperienceEntry(Base, TimestampMixin):
    """
    The Experience Library — source-of-truth for all work experience.
    Each entry represents one job/role. Bullets are stored as JSON.
    Source tracks how the entry was added (linkedin/manual/interview/upload).
    """

    __tablename__ = "experience_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    profile_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[str | None] = mapped_column(String(20), nullable=True)  # YYYY-MM or YYYY
    end_date: Mapped[str | None] = mapped_column(String(20), nullable=True)  # None = current
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    raw_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Bullets stored as JSON list of BulletEntry objects:
    # [{"id": "uuid", "text": "...", "is_quantified": bool, "tags": [...], "source": "original|ai_suggested|user_edited"}]
    bullets: Mapped[list] = mapped_column(JSON, default=list)

    skills_demonstrated: Mapped[list] = mapped_column(JSON, default=list)  # ["python", "aws", ...]
    industries: Mapped[list] = mapped_column(JSON, default=list)
    impact_metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Source: linkedin | manual | interview | upload
    source: Mapped[str] = mapped_column(String(50), default="manual")
    sort_order: Mapped[int] = mapped_column(default=0)

    # Relationships
    profile: Mapped["UserProfile"] = relationship("UserProfile", back_populates="experience_entries")
    resume_bullets: Mapped[list["ResumeBullet"]] = relationship(
        "ResumeBullet", back_populates="experience_entry", cascade="all, delete-orphan"
    )
