from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.experience import ExperienceEntry
from app.models.user_profile import UserProfile
from app.schemas.experience import ExperienceCreate, ExperienceResponse, ExperienceUpdate

router = APIRouter()


def _get_profile_or_404(profile_id: str, db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/", response_model=list[ExperienceResponse])
def list_experience(profile_id: str, db: Session = Depends(get_db)):
    _get_profile_or_404(profile_id, db)
    return (
        db.query(ExperienceEntry)
        .filter(ExperienceEntry.profile_id == profile_id)
        .order_by(ExperienceEntry.sort_order, ExperienceEntry.created_at.desc())
        .all()
    )


@router.post("/", response_model=ExperienceResponse, status_code=201)
def create_experience(profile_id: str, data: ExperienceCreate, db: Session = Depends(get_db)):
    _get_profile_or_404(profile_id, db)
    entry = ExperienceEntry(
        profile_id=profile_id,
        **data.model_dump(exclude={"bullets"}),
        bullets=[b.model_dump() for b in data.bullets],
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=ExperienceResponse)
def get_experience(profile_id: str, entry_id: str, db: Session = Depends(get_db)):
    entry = (
        db.query(ExperienceEntry)
        .filter(ExperienceEntry.id == entry_id, ExperienceEntry.profile_id == profile_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Experience entry not found")
    return entry


@router.patch("/{entry_id}", response_model=ExperienceResponse)
def update_experience(
    profile_id: str, entry_id: str, data: ExperienceUpdate, db: Session = Depends(get_db)
):
    entry = (
        db.query(ExperienceEntry)
        .filter(ExperienceEntry.id == entry_id, ExperienceEntry.profile_id == profile_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Experience entry not found")

    update_data = data.model_dump(exclude_none=True)
    if "bullets" in update_data:
        update_data["bullets"] = [
            b.model_dump() if hasattr(b, "model_dump") else b
            for b in update_data["bullets"]
        ]
    for field, value in update_data.items():
        setattr(entry, field, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_experience(profile_id: str, entry_id: str, db: Session = Depends(get_db)):
    entry = (
        db.query(ExperienceEntry)
        .filter(ExperienceEntry.id == entry_id, ExperienceEntry.profile_id == profile_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Experience entry not found")
    db.delete(entry)
    db.commit()
