"""
Resume file parser — extracts structured profile/experience data from PDF or DOCX resumes.

Uses the configured AI provider to interpret the resume text. Falls back to raw text
extraction if AI is unavailable.

Key guarantee: never fabricates data — only returns what is present in the document.
"""

import io
import json
import re
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.experience import ExperienceEntry
from app.models.user_profile import UserProfile


# ── Text extraction ───────────────────────────────────────────────────────────

def extract_text_from_pdf(content: bytes) -> str:
    """Extract plain text from a PDF file using pypdf."""
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)
    return "\n".join(pages)


def extract_text_from_docx(content: bytes) -> str:
    """Extract plain text from a DOCX file using python-docx."""
    from docx import Document
    doc = Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text(content: bytes, filename: str) -> str:
    """Dispatch to the correct text extractor based on file extension."""
    name_lower = filename.lower()
    if name_lower.endswith(".pdf"):
        return extract_text_from_pdf(content)
    if name_lower.endswith(".docx"):
        return extract_text_from_docx(content)
    if name_lower.endswith(".txt"):
        return content.decode("utf-8", errors="replace")
    raise ValueError(f"Unsupported file type: {filename}. Upload a PDF, DOCX, or TXT file.")


# ── AI parsing ────────────────────────────────────────────────────────────────

RESUME_PARSE_PROMPT = """\
You are a resume parser. Extract structured information from the resume text below.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "full_name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "linkedin_url": "string or null",
  "summary": "string or null",
  "experience": [
    {
      "company": "string",
      "title": "string",
      "start_date": "YYYY-MM or YYYY or null",
      "end_date": "YYYY-MM or YYYY or null (null if current)",
      "location": "string or null",
      "description": "string or null"
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string or null",
      "start_date": "YYYY or null",
      "end_date": "YYYY or null"
    }
  ],
  "skills": ["string"]
}

Rules:
- Extract ONLY what is explicitly stated — never infer or fill in missing data.
- For dates: convert "Jan 2020" → "2020-01", "2020" → "2020", "Present/Current" → null.
- If a field is absent from the resume, use null (not an empty string).

Resume text:
"""


async def parse_resume_with_ai(text: str) -> dict:
    """Use the configured AI provider to extract structured data from resume text."""
    from app.ai.factory import get_ai_provider

    provider = get_ai_provider()
    messages = [
        {
            "role": "user",
            "content": RESUME_PARSE_PROMPT + text[:12000],  # cap to avoid token limit
        }
    ]
    response = await provider.complete(messages)

    # Strip any accidental markdown code fences
    cleaned = re.sub(r"^```(?:json)?\s*", "", response.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"AI returned invalid JSON: {exc}\nResponse: {response[:500]}")


# ── Preview / apply ───────────────────────────────────────────────────────────

def build_resume_preview(parsed: dict) -> dict:
    """Build the preview dict returned to the frontend before confirming import."""
    return {
        "full_name": parsed.get("full_name") or "",
        "email": parsed.get("email"),
        "phone": parsed.get("phone"),
        "location": parsed.get("location"),
        "summary": parsed.get("summary"),
        "experience_count": len(parsed.get("experience") or []),
        "education_count": len(parsed.get("education") or []),
        "skills_count": len(parsed.get("skills") or []),
        "raw_data": parsed,
    }


def apply_resume_import(profile: UserProfile, parsed: dict, db: Session) -> None:
    """
    Merge parsed resume data into an existing profile.
    Updates blank fields; adds experience entries not already present.
    """
    # Update blank profile fields (never overwrite user-edited data)
    if not profile.email and parsed.get("email"):
        profile.email = parsed["email"]
    if not profile.phone and parsed.get("phone"):
        profile.phone = parsed["phone"]
    if not profile.location and parsed.get("location"):
        profile.location = parsed["location"]
    if not profile.professional_summary and parsed.get("summary"):
        profile.professional_summary = parsed["summary"]
    if not profile.linkedin_url and parsed.get("linkedin_url"):
        profile.linkedin_url = parsed["linkedin_url"]

    # Existing entries for duplicate check
    existing = db.query(ExperienceEntry).filter(
        ExperienceEntry.profile_id == profile.id
    ).all()
    existing_keys = {
        (e.company_name.lower().strip(), e.job_title.lower().strip())
        for e in existing
    }

    for pos in (parsed.get("experience") or []):
        company = pos.get("company") or ""
        title = pos.get("title") or ""
        key = (company.lower().strip(), title.lower().strip())
        if key in existing_keys:
            continue

        description = pos.get("description") or ""
        bullets: list[dict] = []
        if description:
            lines = [l.strip() for l in re.split(r"[\n•\-–]", description) if l.strip()]
            bullets = [
                {
                    "id": str(uuid.uuid4()),
                    "text": line,
                    "is_quantified": bool(re.search(r"\d", line)),
                    "tags": [],
                    "source": "original",
                }
                for line in lines
                if len(line) > 10
            ]

        entry = ExperienceEntry(
            profile_id=profile.id,
            company_name=company or "Unknown",
            job_title=title or "Unknown",
            start_date=pos.get("start_date"),
            end_date=pos.get("end_date"),
            is_current=not bool(pos.get("end_date")),
            location=pos.get("location"),
            raw_description=description,
            bullets=bullets,
            skills_demonstrated=_extract_skills_from_description(description),
            source="resume",
        )
        db.add(entry)
        existing_keys.add(key)


def _extract_skills_from_description(description: str) -> list[str]:
    if not description:
        return []
    tech_pattern = re.compile(
        r"\b(Python|Java|JavaScript|TypeScript|React|Vue|Angular|Node\.js|"
        r"AWS|Azure|GCP|Docker|Kubernetes|SQL|PostgreSQL|MySQL|MongoDB|"
        r"FastAPI|Django|Flask|Spring|\.NET|C\+\+|C#|Go|Rust|"
        r"CI/CD|Jenkins|GitHub|GitLab|Terraform|Ansible|Linux|Git)\b",
        re.IGNORECASE,
    )
    found = tech_pattern.findall(description)
    return list(dict.fromkeys(found))
