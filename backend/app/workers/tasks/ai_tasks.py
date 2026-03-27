import asyncio
import json

from app.workers.celery_app import celery_app


@celery_app.task(name="ai.gap_analysis", bind=True)
def run_gap_analysis_task(self, resume_version_id: str, job_description: str) -> dict:
    """Run gap analysis between a resume version and a job description."""
    from app.db.session import SessionLocal
    from app.models.resume import ResumeVersion
    from app.models.experience import ExperienceEntry
    from app.ai.factory import get_ai_provider
    from app.ai.prompts.gap_analysis import build_gap_analysis_messages

    db = SessionLocal()
    try:
        resume = db.query(ResumeVersion).filter(ResumeVersion.id == resume_version_id).first()
        if not resume:
            raise ValueError(f"Resume {resume_version_id} not found")

        experiences = (
            db.query(ExperienceEntry)
            .filter(ExperienceEntry.id.in_(resume.selected_experience_ids or []))
            .all()
        )

        resume_data = {
            "id": resume.id,
            "name": resume.name,
            "custom_summary": resume.custom_summary,
            "skills": resume.skills_selection,
            "experience": [
                {
                    "id": e.id,
                    "company": e.company_name,
                    "title": e.job_title,
                    "start_date": e.start_date,
                    "end_date": e.end_date,
                    "bullets": e.bullets,
                    "skills": e.skills_demonstrated,
                }
                for e in experiences
            ],
        }

        messages = build_gap_analysis_messages(resume_data, job_description)
        provider = get_ai_provider()
        result_text = asyncio.run(provider.complete(messages))

        # Parse JSON from response
        try:
            # Extract JSON from response (may have surrounding text)
            start = result_text.find("{")
            end = result_text.rfind("}") + 1
            result = json.loads(result_text[start:end])
        except (json.JSONDecodeError, ValueError):
            result = {"raw_response": result_text, "parse_error": True}

        # Cache result on the resume version
        resume.gap_analysis_result = result
        db.commit()

        return result
    finally:
        db.close()


@celery_app.task(name="ai.generate_cover_letter", bind=True)
def generate_cover_letter_task(
    self,
    job_application_id: str,
    resume_version_id: str | None,
    tone: str,
    additional_notes: str | None,
) -> dict:
    """Generate a cover letter for a job application."""
    from app.db.session import SessionLocal
    from app.models.job_application import JobApplication
    from app.models.resume import ResumeVersion
    from app.models.cover_letter import CoverLetter
    from app.ai.factory import get_ai_provider
    from app.ai.prompts.cover_letter import build_cover_letter_messages

    db = SessionLocal()
    try:
        job = db.query(JobApplication).filter(JobApplication.id == job_application_id).first()
        if not job:
            raise ValueError(f"Job application {job_application_id} not found")

        profile = job.profile
        profile_data = {
            "full_name": profile.full_name,
            "email": profile.email,
            "phone": profile.phone,
            "location": profile.location,
            "professional_summary": profile.professional_summary,
        }

        job_data = {
            "company_name": job.company_name,
            "job_title": job.job_title,
            "job_description": job.job_description,
        }

        resume_data = None
        if resume_version_id:
            resume = db.query(ResumeVersion).filter(ResumeVersion.id == resume_version_id).first()
            if resume:
                resume_data = {
                    "custom_summary": resume.custom_summary,
                    "skills": resume.skills_selection,
                }

        messages = build_cover_letter_messages(profile_data, job_data, resume_data, tone, additional_notes)
        provider = get_ai_provider()
        body_plain = asyncio.run(provider.complete(messages))

        # Convert plain text to basic HTML (preserve paragraphs)
        paragraphs = [p.strip() for p in body_plain.split("\n\n") if p.strip()]
        body_html = "".join(f"<p>{p}</p>" for p in paragraphs)

        # Save the cover letter
        letter = CoverLetter(
            job_application_id=job_application_id,
            resume_version_id=resume_version_id,
            body_html=body_html,
            body_plain=body_plain,
            tone=tone,
            is_ai_generated=True,
            ai_generation_prompt=f"tone={tone}, notes={additional_notes}",
        )
        db.add(letter)
        db.commit()
        db.refresh(letter)

        return {"cover_letter_id": letter.id}
    finally:
        db.close()


@celery_app.task(name="ai.score_experience", bind=True)
def score_experience_task(self, experience_id: str, job_description: str) -> dict:
    """Score a single experience entry against a job description."""
    from app.db.session import SessionLocal
    from app.models.experience import ExperienceEntry
    from app.ai.factory import get_ai_provider
    import json

    db = SessionLocal()
    try:
        entry = db.query(ExperienceEntry).filter(ExperienceEntry.id == experience_id).first()
        if not entry:
            raise ValueError(f"Experience {experience_id} not found")

        messages = [
            {
                "role": "user",
                "content": f"""Score this experience entry against the job requirements.

EXPERIENCE:
{entry.job_title} at {entry.company_name}
Bullets:
{chr(10).join(f"- {b['text']}" for b in (entry.bullets or []))}
Skills: {', '.join(entry.skills_demonstrated or [])}

JOB DESCRIPTION:
{job_description[:2000]}

Rate the match 0-100 and return JSON:
{{"score": <number>, "confidence": "<DIRECT|TRANSFERABLE|ADJACENT|WEAK|GAP>", "matched_requirements": ["..."], "evidence": "..."}}""",
            }
        ]

        provider = get_ai_provider()
        result_text = asyncio.run(provider.complete(messages))
        start = result_text.find("{")
        end = result_text.rfind("}") + 1
        return json.loads(result_text[start:end])
    finally:
        db.close()
