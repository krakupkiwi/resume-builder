from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.resume import ResumeVersion
    from app.models.cover_letter import CoverLetter


class GeneratedDocument(Base, TimestampMixin):
    __tablename__ = "generated_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    resume_version_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("resume_versions.id", ondelete="CASCADE"), nullable=True
    )
    cover_letter_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("cover_letters.id", ondelete="CASCADE"), nullable=True
    )
    format: Mapped[str] = mapped_column(String(10), nullable=False)  # docx | pdf
    template_name: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    resume_version: Mapped["ResumeVersion | None"] = relationship(
        "ResumeVersion", back_populates="generated_documents"
    )
    cover_letter: Mapped["CoverLetter | None"] = relationship(
        "CoverLetter", back_populates="generated_documents"
    )
