import os


def generate_document_task(
    resume_version_id: str | None,
    cover_letter_id: str | None,
    format: str,
    template_name: str,
) -> dict:
    """Generate a Word or PDF document for a resume version or cover letter."""
    from app.db.session import SessionLocal
    from app.models.resume import ResumeVersion
    from app.models.cover_letter import CoverLetter
    from app.models.experience import ExperienceEntry
    from app.models.document import GeneratedDocument
    from app.config import settings

    db = SessionLocal()
    try:
        os.makedirs(settings.STORAGE_PATH, exist_ok=True)

        if resume_version_id:
            resume = db.query(ResumeVersion).filter(ResumeVersion.id == resume_version_id).first()
            if not resume:
                raise ValueError(f"Resume {resume_version_id} not found")

            experiences = (
                db.query(ExperienceEntry)
                .filter(ExperienceEntry.id.in_(resume.selected_experience_ids or []))
                .all()
            )

            profile = resume.profile
            safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in profile.full_name)
            safe_company = "".join(c if c.isalnum() or c in " _-" else "_" for c in (resume.job_title_target or "Resume"))
            filename = f"{safe_name}_{safe_company}_{resume.id[:8]}.{format}"
            file_path = os.path.join(settings.STORAGE_PATH, filename)

            if format == "docx":
                from app.document_generation.docx_generator import generate_docx
                generate_docx(resume, experiences, template_name, file_path)
            elif format == "pdf":
                from app.document_generation.pdf_generator import generate_pdf
                generate_pdf(resume, experiences, template_name, file_path)
            else:
                raise ValueError(f"Unsupported format: {format}")

            file_size = os.path.getsize(file_path)
            doc = GeneratedDocument(
                resume_version_id=resume_version_id,
                format=format,
                template_name=template_name,
                file_path=file_path,
                file_size_bytes=file_size,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            return {"document_id": doc.id, "file_path": file_path}

        elif cover_letter_id:
            letter = db.query(CoverLetter).filter(CoverLetter.id == cover_letter_id).first()
            if not letter:
                raise ValueError(f"Cover letter {cover_letter_id} not found")

            filename = f"CoverLetter_{cover_letter_id[:8]}.{format}"
            file_path = os.path.join(settings.STORAGE_PATH, filename)

            if format == "docx":
                from app.document_generation.docx_generator import generate_cover_letter_docx
                generate_cover_letter_docx(letter, file_path)
            elif format == "pdf":
                from app.document_generation.pdf_generator import generate_cover_letter_pdf
                generate_cover_letter_pdf(letter, file_path)

            file_size = os.path.getsize(file_path)
            doc = GeneratedDocument(
                cover_letter_id=cover_letter_id,
                format=format,
                template_name=template_name,
                file_path=file_path,
                file_size_bytes=file_size,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            return {"document_id": doc.id, "file_path": file_path}

        else:
            raise ValueError("Either resume_version_id or cover_letter_id must be provided")
    finally:
        db.close()
