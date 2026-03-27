import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.profile import ProfileResponse

router = APIRouter()


class LinkedInImportPreview(BaseModel):
    full_name: str
    email: str | None
    location: str | None
    headline: str | None
    summary: str | None
    experience_count: int
    education_count: int
    skills_count: int
    raw_data: dict


@router.post("/linkedin/preview", response_model=LinkedInImportPreview)
async def preview_linkedin_import(file: UploadFile = File(...)):
    """Parse the LinkedIn JSON export and return a preview without saving."""
    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    from app.services.linkedin_service import parse_linkedin_export
    preview = parse_linkedin_export(data)
    return preview


@router.post("/linkedin/{profile_id}", response_model=ProfileResponse)
async def import_linkedin(
    profile_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Import LinkedIn JSON export into an existing profile.
    Merges experience and skills; does not overwrite manually entered data.
    """
    from app.models.user_profile import UserProfile
    from app.services.linkedin_service import apply_linkedin_import

    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    apply_linkedin_import(profile, data, db)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/linkedin/new", response_model=ProfileResponse)
async def import_linkedin_new_profile(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Create a brand new profile from a LinkedIn JSON export."""
    from app.models.user_profile import UserProfile
    from app.services.linkedin_service import parse_linkedin_export, apply_linkedin_import

    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    preview = parse_linkedin_export(data)
    profile = UserProfile(
        full_name=preview["full_name"],
        email=preview.get("email"),
        location=preview.get("location"),
        professional_summary=preview.get("summary"),
        raw_linkedin_data=data,
    )
    db.add(profile)
    db.flush()  # get the ID before applying experience

    apply_linkedin_import(profile, data, db)
    db.commit()
    db.refresh(profile)
    return profile
