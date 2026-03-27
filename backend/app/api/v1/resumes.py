from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.resume import ResumeVersion, ResumeBullet
from app.models.user_profile import UserProfile
from app.schemas.resume import (
    ResumeCreate,
    ResumeResponse,
    ResumeUpdate,
    ResumeBulletCreate,
    ResumeBulletResponse,
    ResumeBulletUpdate,
)

router = APIRouter()


def _get_profile_or_404(profile_id: str, db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


def _get_resume_or_404(profile_id: str, resume_id: str, db: Session) -> ResumeVersion:
    resume = (
        db.query(ResumeVersion)
        .filter(ResumeVersion.id == resume_id, ResumeVersion.profile_id == profile_id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.get("/", response_model=list[ResumeResponse])
def list_resumes(profile_id: str, db: Session = Depends(get_db)):
    _get_profile_or_404(profile_id, db)
    return (
        db.query(ResumeVersion)
        .filter(ResumeVersion.profile_id == profile_id)
        .order_by(ResumeVersion.updated_at.desc())
        .all()
    )


@router.post("/", response_model=ResumeResponse, status_code=201)
def create_resume(profile_id: str, data: ResumeCreate, db: Session = Depends(get_db)):
    _get_profile_or_404(profile_id, db)
    resume = ResumeVersion(profile_id=profile_id, **data.model_dump())
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(profile_id: str, resume_id: str, db: Session = Depends(get_db)):
    return _get_resume_or_404(profile_id, resume_id, db)


@router.patch("/{resume_id}", response_model=ResumeResponse)
def update_resume(
    profile_id: str, resume_id: str, data: ResumeUpdate, db: Session = Depends(get_db)
):
    resume = _get_resume_or_404(profile_id, resume_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(resume, field, value)
    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=204)
def delete_resume(profile_id: str, resume_id: str, db: Session = Depends(get_db)):
    resume = _get_resume_or_404(profile_id, resume_id, db)
    db.delete(resume)
    db.commit()


# ── Bullet overrides ────────────────────────────────────────────────────────

@router.get("/{resume_id}/bullets", response_model=list[ResumeBulletResponse])
def list_bullets(profile_id: str, resume_id: str, db: Session = Depends(get_db)):
    _get_resume_or_404(profile_id, resume_id, db)
    return (
        db.query(ResumeBullet)
        .filter(ResumeBullet.resume_version_id == resume_id)
        .order_by(ResumeBullet.position)
        .all()
    )


@router.post("/{resume_id}/bullets", response_model=ResumeBulletResponse, status_code=201)
def upsert_bullet(
    profile_id: str, resume_id: str, data: ResumeBulletCreate, db: Session = Depends(get_db)
):
    _get_resume_or_404(profile_id, resume_id, db)
    # Check if an override already exists for this bullet
    existing = (
        db.query(ResumeBullet)
        .filter(
            ResumeBullet.resume_version_id == resume_id,
            ResumeBullet.original_bullet_id == data.original_bullet_id,
        )
        .first()
    )
    if existing:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    bullet = ResumeBullet(resume_version_id=resume_id, **data.model_dump())
    db.add(bullet)
    db.commit()
    db.refresh(bullet)
    return bullet


@router.patch("/{resume_id}/bullets/{bullet_id}", response_model=ResumeBulletResponse)
def update_bullet(
    profile_id: str,
    resume_id: str,
    bullet_id: str,
    data: ResumeBulletUpdate,
    db: Session = Depends(get_db),
):
    bullet = (
        db.query(ResumeBullet)
        .filter(ResumeBullet.id == bullet_id, ResumeBullet.resume_version_id == resume_id)
        .first()
    )
    if not bullet:
        raise HTTPException(status_code=404, detail="Bullet not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(bullet, field, value)
    db.commit()
    db.refresh(bullet)
    return bullet


@router.delete("/{resume_id}/bullets/{bullet_id}", status_code=204)
def delete_bullet(
    profile_id: str, resume_id: str, bullet_id: str, db: Session = Depends(get_db)
):
    bullet = (
        db.query(ResumeBullet)
        .filter(ResumeBullet.id == bullet_id, ResumeBullet.resume_version_id == resume_id)
        .first()
    )
    if not bullet:
        raise HTTPException(status_code=404, detail="Bullet not found")
    db.delete(bullet)
    db.commit()
