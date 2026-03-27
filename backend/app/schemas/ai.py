from typing import Any, Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    conversation_id: str | None = None
    resume_version_id: str | None = None
    job_application_id: str | None = None


class GapAnalysisRequest(BaseModel):
    resume_version_id: str
    job_description: str


class BulletRewriteRequest(BaseModel):
    bullet_text: str
    job_description: str
    context: str | None = None  # surrounding experience context


class ExperienceScoringRequest(BaseModel):
    experience_id: str
    job_description: str


class GapItem(BaseModel):
    requirement: str
    confidence: Literal["DIRECT", "TRANSFERABLE", "ADJACENT", "WEAK", "GAP"]
    score: float  # 0-100
    matched_experience_ids: list[str]
    suggestion: str | None = None


class GapAnalysisResult(BaseModel):
    gaps: list[GapItem]
    overall_match_score: float
    top_strengths: list[str]
    key_gaps: list[str]
    task_id: str | None = None  # set when async


class TaskStatus(BaseModel):
    task_id: str
    status: Literal["pending", "started", "success", "failure"]
    result: Any | None = None
    error: str | None = None
