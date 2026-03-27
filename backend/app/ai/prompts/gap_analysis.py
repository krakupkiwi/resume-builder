import json


def build_gap_analysis_messages(resume_data: dict, job_description: str) -> list[dict]:
    """Build messages for gap analysis between a resume version and a job description."""
    resume_json = json.dumps(resume_data, indent=2)

    return [
        {
            "role": "user",
            "content": f"""Analyse the match between this candidate's resume and the job description below.

CANDIDATE RESUME DATA:
{resume_json}

JOB DESCRIPTION:
{job_description}

For each requirement in the job description, score the candidate's match using this 4-dimension framework:
- Direct match (40%): The candidate has explicit experience with this exact skill/tool/responsibility
- Transferable skills (30%): The candidate has adjacent skills that would transfer
- Adjacent experience (20%): Related experience that demonstrates relevant capability
- Impact alignment (10%): Evidence of comparable scale/scope/impact

Confidence bands:
- DIRECT: 90-100% — explicit matching experience
- TRANSFERABLE: 70-89% — strong transferable skills
- ADJACENT: 45-69% — related but not direct
- WEAK: 25-44% — minimal relevant evidence
- GAP: 0-24% — no supporting evidence found

Return a JSON object with this exact structure:
{{
  "overall_match_score": <0-100 float>,
  "top_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "key_gaps": ["<gap 1>", "<gap 2>"],
  "gaps": [
    {{
      "requirement": "<requirement text>",
      "confidence": "<DIRECT|TRANSFERABLE|ADJACENT|WEAK|GAP>",
      "score": <0-100 float>,
      "matched_experience_ids": ["<experience id if matched>"],
      "evidence": "<brief explanation of match or gap — based ONLY on provided data>",
      "suggestion": "<how to address this gap IF the user has real experience to surface, otherwise null>"
    }}
  ]
}}

IMPORTANT: Only reference experience that is in the provided resume data. Do not suggest fabricating or adding experience the candidate does not have.""",
        }
    ]
