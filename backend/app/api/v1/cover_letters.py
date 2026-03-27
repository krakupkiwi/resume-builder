from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.cover_letter import CoverLetter
from app.schemas.cover_letter import (
    CoverLetterCreate,
    CoverLetterResponse,
    CoverLetterUpdate,
    CoverLetterGenerateRequest,
)
from app.schemas.ai import TaskStatus

router = APIRouter()


@router.post("/", response_model=CoverLetterResponse, status_code=201)
def create_cover_letter(data: CoverLetterCreate, db: Session = Depends(get_db)):
    letter = CoverLetter(**data.model_dump())
    db.add(letter)
    db.commit()
    db.refresh(letter)
    return letter


@router.get("/{letter_id}", response_model=CoverLetterResponse)
def get_cover_letter(letter_id: str, db: Session = Depends(get_db)):
    letter = db.query(CoverLetter).filter(CoverLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    return letter


@router.patch("/{letter_id}", response_model=CoverLetterResponse)
def update_cover_letter(letter_id: str, data: CoverLetterUpdate, db: Session = Depends(get_db)):
    letter = db.query(CoverLetter).filter(CoverLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(letter, field, value)
    db.commit()
    db.refresh(letter)
    return letter


@router.delete("/{letter_id}", status_code=204)
def delete_cover_letter(letter_id: str, db: Session = Depends(get_db)):
    letter = db.query(CoverLetter).filter(CoverLetter.id == letter_id).first()
    if not letter:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    db.delete(letter)
    db.commit()


@router.post("/generate", response_model=TaskStatus)
def generate_cover_letter(data: CoverLetterGenerateRequest, db: Session = Depends(get_db)):
    """Enqueue an async cover letter generation task."""
    from app.workers.tasks.ai_tasks import generate_cover_letter_task
    task = generate_cover_letter_task.delay(
        job_application_id=data.job_application_id,
        resume_version_id=data.resume_version_id,
        tone=data.tone,
        additional_notes=data.additional_notes,
    )
    return TaskStatus(task_id=task.id, status="pending")
