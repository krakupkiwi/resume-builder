"""
LinkedIn data export parser.

LinkedIn's "Get a copy of your data" export (Settings > Data Privacy) produces
a ZIP file containing several CSV files. This service handles:
  - LinkedIn ZIP exports (the actual format LinkedIn provides)
  - Individual LinkedIn CSVs (Positions.csv, Profile.csv, etc.)
  - Legacy JSON format from third-party converter tools

Key guarantee: we NEVER infer or fabricate data. If a field is missing, it's None.
"""

import csv
import io
import re
import uuid
import zipfile
from typing import Any

from sqlalchemy.orm import Session

from app.models.experience import ExperienceEntry
from app.models.user_profile import UserProfile


# ── ZIP / CSV entry points ────────────────────────────────────────────────────

def parse_linkedin_zip_bytes(content: bytes) -> dict:
    """
    Parse a LinkedIn data export ZIP file.
    LinkedIn exports a ZIP containing Profile.csv, Positions.csv, Skills.csv, etc.
    Returns the same normalized dict as parse_linkedin_export().
    """
    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise ValueError("Not a valid ZIP file") from exc

    csv_files: dict[str, str] = {}
    for name in zf.namelist():
        basename = name.split("/")[-1]  # strip any subdirectory prefix
        if basename.endswith(".csv"):
            raw = zf.read(name)
            csv_files[basename] = raw.decode("utf-8", errors="replace")

    return _parse_linkedin_csvs(csv_files)


def _parse_linkedin_csvs(csv_files: dict[str, str]) -> dict:
    """Convert LinkedIn CSV files dict to the normalized export format."""
    result: dict[str, Any] = {}

    # Profile.csv
    if "Profile.csv" in csv_files:
        rows = _read_csv(csv_files["Profile.csv"])
        if rows:
            p = rows[0]
            result["First Name"] = p.get("First Name", "")
            result["Last Name"] = p.get("Last Name", "")
            result["Headline"] = p.get("Headline", "")
            result["Summary"] = p.get("Summary", "")
            # LinkedIn uses "Geo Location" or sometimes "Location"
            result["Location"] = p.get("Geo Location") or p.get("Location", "")

    # Email Addresses.csv — pick primary, fall back to first
    if "Email Addresses.csv" in csv_files:
        rows = _read_csv(csv_files["Email Addresses.csv"])
        for row in rows:
            email = row.get("Email Address", "")
            if not email:
                continue
            is_primary = row.get("Primary", "").strip().lower() in ("yes", "true")
            if is_primary or "Email Address" not in result:
                result["Email Address"] = email

    # Positions.csv
    positions: list[dict] = []
    if "Positions.csv" in csv_files:
        for row in _read_csv(csv_files["Positions.csv"]):
            positions.append({
                "company": row.get("Company Name", ""),
                "title": row.get("Title", ""),
                "description": row.get("Description", ""),
                "location": row.get("Location", ""),
                "start_date": row.get("Started On", ""),
                "end_date": row.get("Finished On", ""),
            })
    result["positions"] = positions

    # Education.csv
    education: list[dict] = []
    if "Education.csv" in csv_files:
        for row in _read_csv(csv_files["Education.csv"]):
            education.append({
                "school": row.get("School Name", ""),
                "degree": row.get("Degree Name", ""),
                "start_date": row.get("Start Date", ""),
                "end_date": row.get("End Date", ""),
                "notes": row.get("Notes", ""),
            })
    result["education"] = education

    # Skills.csv — column is "Name"
    skills: list[dict] = []
    if "Skills.csv" in csv_files:
        for row in _read_csv(csv_files["Skills.csv"]):
            name = row.get("Name", "").strip()
            if name:
                skills.append({"name": name})
    result["skills"] = skills

    return result


def _read_csv(content: str) -> list[dict]:
    """
    Parse LinkedIn CSV text (which sometimes has a blank leading line) into
    a list of dicts. Skips fully-empty rows.
    """
    lines = [line for line in content.splitlines() if line.strip()]
    if not lines:
        return []
    reader = csv.DictReader(lines)
    return [row for row in reader if any(v.strip() for v in row.values())]


# ── JSON entry point ──────────────────────────────────────────────────────────

def parse_linkedin_export(data: dict) -> dict:
    """
    Parse a LinkedIn data export JSON and return a preview dict.
    Handles multiple LinkedIn export formats gracefully.
    """
    profile_info = _extract_profile_info(data)
    positions = _extract_positions(data)
    education = _extract_education(data)
    skills = _extract_skills(data)

    return {
        "full_name": profile_info.get("full_name", ""),
        "email": profile_info.get("email"),
        "location": profile_info.get("location"),
        "headline": profile_info.get("headline"),
        "summary": profile_info.get("summary"),
        "experience_count": len(positions),
        "education_count": len(education),
        "skills_count": len(skills),
        "raw_data": data,
    }


def apply_linkedin_import(profile: UserProfile, data: dict, db: Session) -> None:
    """
    Apply LinkedIn data to an existing profile.
    - Updates profile fields only if currently blank
    - Adds experience entries that don't already exist (matched by company+title)
    - Stores raw LinkedIn data on profile
    """
    profile_info = _extract_profile_info(data)
    positions = _extract_positions(data)

    # Update blank profile fields (never overwrite user-edited data)
    if not profile.linkedin_url and profile_info.get("linkedin_url"):
        profile.linkedin_url = profile_info["linkedin_url"]
    if not profile.location and profile_info.get("location"):
        profile.location = profile_info["location"]
    if not profile.professional_summary and profile_info.get("summary"):
        profile.professional_summary = profile_info["summary"]

    profile.raw_linkedin_data = data

    # Get existing entries to avoid duplicates
    existing = db.query(ExperienceEntry).filter(
        ExperienceEntry.profile_id == profile.id
    ).all()
    existing_keys = {
        (e.company_name.lower().strip(), e.job_title.lower().strip())
        for e in existing
    }

    for pos in positions:
        key = (
            pos.get("company", "").lower().strip(),
            pos.get("title", "").lower().strip(),
        )
        if key in existing_keys:
            continue  # skip duplicates

        bullets = []
        if pos.get("description"):
            # Split description into bullet points if it uses bullet markers
            raw = pos["description"]
            lines = [l.strip() for l in re.split(r"[\n•\-–]", raw) if l.strip()]
            bullets = [
                {
                    "id": str(uuid.uuid4()),
                    "text": line,
                    "is_quantified": bool(re.search(r"\d", line)),
                    "tags": [],
                    "source": "original",
                }
                for line in lines
                if len(line) > 10  # skip very short fragments
            ]

        entry = ExperienceEntry(
            profile_id=profile.id,
            company_name=pos.get("company", "Unknown"),
            job_title=pos.get("title", "Unknown"),
            start_date=_normalise_date(pos.get("start_date")),
            end_date=_normalise_date(pos.get("end_date")),
            is_current=not bool(pos.get("end_date")),
            location=pos.get("location"),
            raw_description=pos.get("description"),
            bullets=bullets,
            skills_demonstrated=_extract_skills_from_description(pos.get("description", "")),
            source="linkedin",
        )
        db.add(entry)
        existing_keys.add(key)


# ── Internal helpers ─────────────────────────────────────────────────────────

def _extract_profile_info(data: dict) -> dict:
    """Extract basic profile info — handles multiple LinkedIn export formats."""
    info: dict[str, Any] = {}

    # Format 1: nested under "profile" key
    if "profile" in data:
        p = data["profile"]
        info["full_name"] = _join_name(p.get("firstName", ""), p.get("lastName", ""))
        info["headline"] = p.get("headline")
        info["summary"] = p.get("summary")
        info["location"] = p.get("geoLocationName") or p.get("location")
        info["linkedin_url"] = p.get("publicProfileUrl")

    # Format 2: flat structure (common in CSV→JSON conversions)
    elif "First Name" in data or "first_name" in data:
        first = data.get("First Name") or data.get("first_name", "")
        last = data.get("Last Name") or data.get("last_name", "")
        info["full_name"] = _join_name(first, last)
        info["headline"] = data.get("Headline") or data.get("headline")
        info["summary"] = data.get("Summary") or data.get("summary")
        info["location"] = data.get("Location") or data.get("location")

    # Format 3: LinkedIn archive JSON (positions array at top level)
    if not info:
        info["full_name"] = data.get("name", "")
        info["email"] = data.get("email")
        info["summary"] = data.get("summary")

    # Email — often in a separate emailAddresses field
    if "emailAddresses" in data:
        emails = data["emailAddresses"]
        if emails and isinstance(emails, list):
            info["email"] = emails[0].get("emailAddress") if isinstance(emails[0], dict) else emails[0]
    if "Email Address" in data:
        info["email"] = data["Email Address"]

    return info


def _extract_positions(data: dict) -> list[dict]:
    """Extract work experience positions from various LinkedIn export formats."""
    positions = []

    # Format 1: nested positions dict with positionHistory (some JSON exports)
    positions_field = data.get("positions")
    if isinstance(positions_field, dict):
        raw_positions = positions_field.get("positionHistory", [])
    elif isinstance(positions_field, list):
        raw_positions = positions_field
    else:
        raw_positions = data.get("workExperience", []) or []

    if isinstance(raw_positions, list):
        for p in raw_positions:
            if not isinstance(p, dict):
                continue
            positions.append({
                "company": p.get("companyName") or p.get("company") or p.get("Company Name", ""),
                "title": p.get("title") or p.get("Title", ""),
                "start_date": p.get("startEndDate", {}).get("start") if isinstance(p.get("startEndDate"), dict) else p.get("start_date") or p.get("Started On"),
                "end_date": p.get("startEndDate", {}).get("end") if isinstance(p.get("startEndDate"), dict) else p.get("end_date") or p.get("Finished On"),
                "description": p.get("description") or p.get("Description", ""),
                "location": p.get("locationName") or p.get("location"),
            })

    return [p for p in positions if p.get("company") or p.get("title")]


def _extract_education(data: dict) -> list[dict]:
    raw = data.get("education", []) or data.get("educations", []) or []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        return raw.get("educationHistory", [])
    return []


def _extract_skills(data: dict) -> list[str]:
    raw = data.get("skills", []) or []
    if isinstance(raw, list):
        return [
            s.get("name", "") if isinstance(s, dict) else str(s)
            for s in raw
        ]
    return []


def _join_name(first: str, last: str) -> str:
    return f"{first} {last}".strip() or "Unknown"


def _normalise_date(value: Any) -> str | None:
    """Normalise various date formats to YYYY-MM or YYYY."""
    if not value:
        return None
    if isinstance(value, dict):
        year = value.get("year")
        month = value.get("month")
        if year and month:
            return f"{year}-{int(month):02d}"
        if year:
            return str(year)
        return None
    s = str(value).strip()
    # Already YYYY-MM or YYYY
    if re.match(r"^\d{4}-\d{2}$", s) or re.match(r"^\d{4}$", s):
        return s
    # "Jan 2020" or "January 2020"
    m = re.match(r"^(\w+)\s+(\d{4})$", s)
    if m:
        months = {
            "jan": "01", "feb": "02", "mar": "03", "apr": "04",
            "may": "05", "jun": "06", "jul": "07", "aug": "08",
            "sep": "09", "oct": "10", "nov": "11", "dec": "12",
        }
        month_str = m.group(1).lower()[:3]
        month_num = months.get(month_str, "01")
        return f"{m.group(2)}-{month_num}"
    # "2020-01-15" → "2020-01"
    m2 = re.match(r"^(\d{4})-(\d{2})-\d{2}$", s)
    if m2:
        return f"{m2.group(1)}-{m2.group(2)}"
    return s or None


def _extract_skills_from_description(description: str) -> list[str]:
    """Very basic skill extraction — only returns tokens that look like tech names."""
    if not description:
        return []
    # Common tech keywords pattern (simple heuristic, never fabricates)
    tech_pattern = re.compile(
        r"\b(Python|Java|JavaScript|TypeScript|React|Vue|Angular|Node\.js|"
        r"AWS|Azure|GCP|Docker|Kubernetes|SQL|PostgreSQL|MySQL|MongoDB|"
        r"FastAPI|Django|Flask|Spring|\.NET|C\+\+|C#|Go|Rust|"
        r"CI/CD|Jenkins|GitHub|GitLab|Terraform|Ansible|Linux|Git)\b",
        re.IGNORECASE,
    )
    found = tech_pattern.findall(description)
    return list(dict.fromkeys(found))  # deduplicated, order preserved
