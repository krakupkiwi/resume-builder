import json
from typing import AsyncIterator, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.ai import (
    ChatRequest,
    GapAnalysisRequest,
    BulletRewriteRequest,
    ExperienceScoringRequest,
    TaskStatus,
)


class InterviewStartRequest(BaseModel):
    requirement: str
    confidence: str
    score: float
    evidence: str | None = None

router = APIRouter()


@router.post("/chat")
async def chat(data: ChatRequest, db: Session = Depends(get_db)):
    """Streaming chat with the AI assistant. Returns Server-Sent Events."""
    from app.ai.factory import get_ai_provider
    from app.models.ai_conversation import AIConversation
    from app.models.base import utcnow

    provider = get_ai_provider()
    messages = [{"role": m.role, "content": m.content} for m in data.messages]

    async def event_stream() -> AsyncIterator[str]:
        full_response = ""
        async for chunk in provider.stream(messages):
            full_response += chunk
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

        # Persist conversation
        if data.conversation_id:
            conv = db.query(AIConversation).filter(AIConversation.id == data.conversation_id).first()
            if conv:
                msgs = list(conv.messages or [])
                for m in data.messages:
                    msgs.append({"role": m.role, "content": m.content, "timestamp": utcnow().isoformat()})
                msgs.append({"role": "assistant", "content": full_response, "timestamp": utcnow().isoformat()})
                conv.messages = msgs
                db.commit()

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/gap-analysis", response_model=TaskStatus)
def run_gap_analysis(data: GapAnalysisRequest, db: Session = Depends(get_db)):
    """Enqueue async gap analysis task."""
    from app.workers.tasks.ai_tasks import run_gap_analysis_task
    task = run_gap_analysis_task.delay(
        resume_version_id=data.resume_version_id,
        job_description=data.job_description,
    )
    return TaskStatus(task_id=task.id, status="pending")


@router.post("/rewrite-bullet")
async def rewrite_bullet(data: BulletRewriteRequest):
    """Stream a single bullet rewrite suggestion."""
    from app.ai.factory import get_ai_provider
    from app.ai.prompts.bullet_rewrite import build_bullet_rewrite_messages

    provider = get_ai_provider()
    messages = build_bullet_rewrite_messages(
        bullet_text=data.bullet_text,
        job_description=data.job_description,
        context=data.context,
    )

    async def event_stream() -> AsyncIterator[str]:
        async for chunk in provider.stream(messages):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/score-experience", response_model=TaskStatus)
def score_experience(data: ExperienceScoringRequest):
    """Enqueue experience scoring against a job description."""
    from app.workers.tasks.ai_tasks import score_experience_task
    task = score_experience_task.delay(
        experience_id=data.experience_id,
        job_description=data.job_description,
    )
    return TaskStatus(task_id=task.id, status="pending")


@router.post("/interview/start")
async def start_interview(data: InterviewStartRequest):
    """Start a branching discovery interview for a gap item. Streams the first question."""
    from app.ai.factory import get_ai_provider
    from app.ai.prompts.interview import build_interview_start_messages

    provider = get_ai_provider()
    gap_item = {
        "requirement": data.requirement,
        "confidence": data.confidence,
        "score": data.score,
        "evidence": data.evidence or f"Current match level: {data.confidence} ({data.score:.0f}%)",
    }
    messages = build_interview_start_messages(gap_item=gap_item, candidate_context={})

    async def event_stream() -> AsyncIterator[str]:
        async for chunk in provider.stream(messages):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/tasks/{task_id}", response_model=TaskStatus)
def get_task_status(task_id: str):
    """Poll for async task status and result."""
    from app.workers.celery_app import celery_app
    result = celery_app.AsyncResult(task_id)

    status_map = {
        "PENDING": "pending",
        "STARTED": "started",
        "SUCCESS": "success",
        "FAILURE": "failure",
    }
    status = status_map.get(result.state, "pending")
    task_result = None
    error = None

    if result.state == "SUCCESS":
        task_result = result.result
    elif result.state == "FAILURE":
        error = str(result.result)

    return TaskStatus(task_id=task_id, status=status, result=task_result, error=error)
