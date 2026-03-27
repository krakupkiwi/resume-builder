from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.job_application import JobApplication
    from app.models.resume import ResumeVersion
    from app.models.document import GeneratedDocument


class CoverLetter(Base, TimestampMixin):
    __tablename__ = "cover_letters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    job_application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False
    )
    resume_version_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    body_html: Mapped[str] = mapped_column(Text, nullable=False, default="")
    body_plain: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # professional | conversational | enthusiastic
    tone: Mapped[str] = mapped_column(String(30), default="professional")

    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_generation_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    job_application: Mapped["JobApplication"] = relationship(
        "JobApplication", back_populates="cover_letters"
    )
    resume_version: Mapped["ResumeVersion | None"] = relationship(
        "ResumeVersion", back_populates="cover_letters"
    )
    generated_documents: Mapped[list["GeneratedDocument"]] = relationship(
        "GeneratedDocument", back_populates="cover_letter", cascade="all, delete-orphan"
    )
