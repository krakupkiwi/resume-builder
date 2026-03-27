import json


def build_cover_letter_messages(
    profile_data: dict,
    job_data: dict,
    resume_data: dict | None,
    tone: str = "professional",
    additional_notes: str | None = None,
) -> list[dict]:
    """Build messages to generate a cover letter."""
    tone_guidance = {
        "professional": "formal, polished, confident — appropriate for corporate environments",
        "conversational": "warm, natural, personable — friendly but still professional",
        "enthusiastic": "energetic, passionate, forward-looking — shows genuine excitement for the role",
    }

    profile_json = json.dumps(profile_data, indent=2)
    resume_summary = json.dumps(resume_data, indent=2) if resume_data else "Use the profile data above."
    notes_block = f"\nADDITIONAL NOTES FROM CANDIDATE:\n{additional_notes}\n" if additional_notes else ""

    return [
        {
            "role": "user",
            "content": f"""Write a cover letter for this job application.

CANDIDATE PROFILE:
{profile_json}

RESUME / RELEVANT EXPERIENCE FOR THIS ROLE:
{resume_summary}

JOB DETAILS:
Company: {job_data.get('company_name', 'the company')}
Role: {job_data.get('job_title', 'the position')}
Job Description:
{job_data.get('job_description', 'Not provided')[:3000]}
{notes_block}
TONE: {tone} — {tone_guidance.get(tone, tone_guidance['professional'])}

Write a compelling cover letter that:
1. Opens with a strong hook that references something specific about the company or role
2. Connects the candidate's ACTUAL experience (from the profile above) to the key job requirements
3. Highlights 2-3 specific achievements from the profile that are most relevant
4. Shows genuine interest in the company/role
5. Closes with a clear call to action

CRITICAL: Only reference experience, achievements, and skills that are present in the candidate's profile data. Do not add qualifications, certifications, or accomplishments they haven't listed.

Format: Plain prose paragraphs (no bullet points in the letter). 3-4 paragraphs. Approximately 300-400 words.""",
        }
    ]
