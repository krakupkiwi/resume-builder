import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import GeneratedDocument
from app.schemas.ai import TaskStatus

router = APIRouter()


class DocumentGenerateRequest(BaseModel):
    resume_version_id: str | None = None
    cover_letter_id: str | None = None
    format: str = "docx"  # docx | pdf
    template_name: str = "classic"


@router.post("/generate", response_model=TaskStatus)
def generate_document(data: DocumentGenerateRequest, db: Session = Depends(get_db)):
    """Enqueue async document generation."""
    from app.workers.tasks.document_tasks import generate_document_task
    task = generate_document_task.delay(
        resume_version_id=data.resume_version_id,
        cover_letter_id=data.cover_letter_id,
        format=data.format,
        template_name=data.template_name,
    )
    return TaskStatus(task_id=task.id, status="pending")


@router.get("/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(GeneratedDocument).filter(GeneratedDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    media_types = {
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pdf": "application/pdf",
    }
    filename = os.path.basename(doc.file_path)
    return FileResponse(
        path=doc.file_path,
        media_type=media_types.get(doc.format, "application/octet-stream"),
        filename=filename,
    )


@router.get("/preview/{resume_version_id}")
def preview_resume(resume_version_id: str, db: Session = Depends(get_db)):
    """Return HTML preview of resume for browser rendering."""
    from app.document_generation.html_renderer import render_resume_html
    from app.models.resume import ResumeVersion
    from app.models.experience import ExperienceEntry
    from fastapi.responses import HTMLResponse

    resume = db.query(ResumeVersion).filter(ResumeVersion.id == resume_version_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    experiences = (
        db.query(ExperienceEntry)
        .filter(ExperienceEntry.id.in_(resume.selected_experience_ids or []))
        .all()
    )

    html = render_resume_html(resume, experiences, resume.template_name)
    return HTMLResponse(content=html)
