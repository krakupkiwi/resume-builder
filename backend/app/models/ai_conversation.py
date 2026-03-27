from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_uuid


class AIConversation(Base, TimestampMixin):
    """Stores full AI conversation history per session (resumable)."""

    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    resume_version_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    job_application_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True
    )

    # chat | interview | gap_analysis
    conversation_type: Mapped[str] = mapped_column(String(30), default="chat")

    # List of {role, content, timestamp, metadata}
    messages: Mapped[list] = mapped_column(JSON, default=list)

    provider_used: Mapped[str] = mapped_column(String(30), default="claude")
    model_used: Mapped[str] = mapped_column(String(100), default="")
