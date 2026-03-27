from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user_profile import UserProfile
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate

router = APIRouter()


@router.get("/", response_model=list[ProfileResponse])
def list_profiles(db: Session = Depends(get_db)):
    return db.query(UserProfile).order_by(UserProfile.created_at.desc()).all()


@router.post("/", response_model=ProfileResponse, status_code=201)
def create_profile(data: ProfileCreate, db: Session = Depends(get_db)):
    profile = UserProfile(**data.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=ProfileResponse)
def get_profile(profile_id: str, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("/{profile_id}", response_model=ProfileResponse)
def update_profile(profile_id: str, data: ProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=204)
def delete_profile(profile_id: str, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(profile)
    db.commit()
