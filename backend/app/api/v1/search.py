from pydantic import BaseModel
from fastapi import APIRouter
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
def search_resume_examples(data: ResumeSearchRequest):
    """Async search for resume examples for a given role."""
    from app.workers.tasks.search_tasks import search_resume_examples_task
    task = search_resume_examples_task.delay(
        role_title=data.role_title,
        industry=data.industry,
        seniority=data.seniority,
    )
    return TaskStatus(task_id=task.id, status="pending")
