from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.profile import ProfileResponse

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


class ResumeImportPreview(BaseModel):
    full_name: str
    email: str | None
    phone: str | None
    location: str | None
    summary: str | None
    experience_count: int
    education_count: int
    skills_count: int
    raw_data: dict


def _check_extension(filename: str) -> None:
    import os
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Upload a PDF, DOCX, or TXT resume.",
        )


@router.post("/resume/preview", response_model=ResumeImportPreview)
async def preview_resume_import(file: UploadFile = File(...)):
    """
    Extract and parse a resume file (PDF/DOCX/TXT) using AI.
    Returns a structured preview without saving anything.
    """
    _check_extension(file.filename or "")
    content = await file.read()

    from app.services.resume_import_service import extract_text, parse_resume_with_ai, build_resume_preview
    try:
        text = extract_text(content, file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from this file.")

    try:
        parsed = await parse_resume_with_ai(text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {exc}")

    return build_resume_preview(parsed)


@router.post("/resume/{profile_id}", response_model=ProfileResponse)
async def import_resume_to_profile(
    profile_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Merge a resume file into an existing profile."""
    _check_extension(file.filename or "")
    content = await file.read()

    from app.models.user_profile import UserProfile
    from app.services.resume_import_service import extract_text, parse_resume_with_ai, apply_resume_import, build_resume_preview

    profile = db.query(UserProfile).filter(UserProfile.id == profile_id).first()

    try:
        text = extract_text(content, file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from this file.")

    try:
        parsed = await parse_resume_with_ai(text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {exc}")

    if not profile:
        # Profile ID was stale — create a new profile from the resume
        profile = UserProfile(
            full_name=parsed.get("full_name") or "My Profile",
            email=parsed.get("email"),
            phone=parsed.get("phone"),
            location=parsed.get("location"),
            professional_summary=parsed.get("summary"),
            linkedin_url=parsed.get("linkedin_url"),
        )
        db.add(profile)
        db.flush()

    apply_resume_import(profile, parsed, db)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/resume/new", response_model=ProfileResponse)
async def import_resume_new_profile(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Create a new profile from a resume file."""
    _check_extension(file.filename or "")
    content = await file.read()

    from app.models.user_profile import UserProfile
    from app.services.resume_import_service import extract_text, parse_resume_with_ai, apply_resume_import

    try:
        text = extract_text(content, file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from this file.")

    try:
        parsed = await parse_resume_with_ai(text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {exc}")

    profile = UserProfile(
        full_name=parsed.get("full_name") or "My Profile",
        email=parsed.get("email"),
        phone=parsed.get("phone"),
        location=parsed.get("location"),
        professional_summary=parsed.get("summary"),
        linkedin_url=parsed.get("linkedin_url"),
    )
    db.add(profile)
    db.flush()

    apply_resume_import(profile, parsed, db)
    db.commit()
    db.refresh(profile)
    return profile
