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


def _load_linkedin_file(content: bytes, filename: str) -> dict:
    """
    Parse a LinkedIn export file — ZIP (the real LinkedIn format) or JSON (legacy).
    Raises HTTPException with a user-friendly message on failure.
    """
    name_lower = (filename or "").lower()

    # ZIP: the actual LinkedIn data export
    if name_lower.endswith(".zip") or content[:2] == b"PK":
        from app.services.linkedin_service import parse_linkedin_zip_bytes
        try:
            return parse_linkedin_zip_bytes(content)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    # JSON: legacy / third-party converter output
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not read file. LinkedIn exports a ZIP file — "
                "upload the .zip file directly (don't extract it)."
            ),
        )


@router.post("/linkedin/preview", response_model=LinkedInImportPreview)
async def preview_linkedin_import(file: UploadFile = File(...)):
    """Parse a LinkedIn export (ZIP or JSON) and return a preview without saving."""
    content = await file.read()
    data = _load_linkedin_file(content, file.filename or "")

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
    Import a LinkedIn export into an existing profile.
    Merges experience and skills; does not overwrite manually entered data.
    """
    from app.models.user_profile import UserProfile
    from app.services.linkedin_service import apply_linkedin_import

    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    content = await file.read()
    data = _load_linkedin_file(content, file.filename or "")

    apply_linkedin_import(profile, data, db)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/linkedin/new", response_model=ProfileResponse)
async def import_linkedin_new_profile(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Create a brand new profile from a LinkedIn export."""
    from app.models.user_profile import UserProfile
    from app.services.linkedin_service import parse_linkedin_export, apply_linkedin_import

    content = await file.read()
    data = _load_linkedin_file(content, file.filename or "")

    preview = parse_linkedin_export(data)
    profile = UserProfile(
        full_name=preview["full_name"],
        email=preview.get("email"),
        location=preview.get("location"),
        professional_summary=preview.get("summary"),
        raw_linkedin_data=data,
    )
    db.add(profile)
    db.flush()

    apply_linkedin_import(profile, data, db)
    db.commit()
    db.refresh(profile)
    return profile
