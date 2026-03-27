from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.job_application import JobApplication
from app.models.user_profile import UserProfile
from app.schemas.job_application import (
    JobApplicationCreate,
    JobApplicationResponse,
    JobApplicationUpdate,
    StatusUpdate,
)

router = APIRouter()


def _get_profile_or_404(profile_id: str, db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


def _get_job_or_404(profile_id: str, job_id: str, db: Session) -> JobApplication:
    job = (
        db.query(JobApplication)
        .filter(JobApplication.id == job_id, JobApplication.profile_id == profile_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job application not found")
    return job


@router.get("/", response_model=list[JobApplicationResponse])
def list_jobs(profile_id: str, db: Session = Depends(get_db)):
    _get_profile_or_404(profile_id, db)
    return (
        db.query(JobApplication)
        .filter(JobApplication.profile_id == profile_id)
        .order_by(JobApplication.updated_at.desc())
        .all()
    )


@router.post("/", response_model=JobApplicationResponse, status_code=201)
def create_job(profile_id: str, data: JobApplicationCreate, db: Session = Depends(get_db)):
    _get_profile_or_404(profile_id, db)
    job = JobApplication(
        profile_id=profile_id,
        **data.model_dump(),
        status_history=[{"status": data.status, "timestamp": datetime.now(timezone.utc).isoformat(), "notes": None}],
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobApplicationResponse)
def get_job(profile_id: str, job_id: str, db: Session = Depends(get_db)):
    return _get_job_or_404(profile_id, job_id, db)


@router.patch("/{job_id}", response_model=JobApplicationResponse)
def update_job(
    profile_id: str, job_id: str, data: JobApplicationUpdate, db: Session = Depends(get_db)
):
    job = _get_job_or_404(profile_id, job_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/status", response_model=JobApplicationResponse)
def update_status(
    profile_id: str, job_id: str, data: StatusUpdate, db: Session = Depends(get_db)
):
    job = _get_job_or_404(profile_id, job_id, db)
    job.status = data.status
    history = list(job.status_history or [])
    history.append({
        "status": data.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": data.notes,
    })
    job.status_history = history
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(profile_id: str, job_id: str, db: Session = Depends(get_db)):
    job = _get_job_or_404(profile_id, job_id, db)
    db.delete(job)
    db.commit()
