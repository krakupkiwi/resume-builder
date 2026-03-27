import asyncio

from pydantic import BaseModel
from fastapi import APIRouter

from app.models.base import new_uuid
from app.schemas.ai import TaskStatus

router = APIRouter()


class ResumeSearchRequest(BaseModel):
    role_title: str
    industry: str | None = None
    seniority: str | None = None


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    source: str


@router.post("/resume-examples", response_model=TaskStatus)
async def search_resume_examples(data: ResumeSearchRequest):
    """Async search for resume examples for a given role."""
    from app.workers.tasks.search_tasks import search_resume_examples_task
    from app.workers.task_manager import create_task, run_task

    task_id = new_uuid()
    create_task(task_id)
    asyncio.create_task(run_task(task_id, search_resume_examples_task,
                                 data.role_title, data.industry, data.seniority))
    return TaskStatus(task_id=task_id, status="pending")
