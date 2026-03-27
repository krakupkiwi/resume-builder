def build_bullet_rewrite_messages(
    bullet_text: str,
    job_description: str,
    context: str | None = None,
) -> list[dict]:
    """Build messages to rewrite a single resume bullet for a target job."""
    context_block = f"\nEXPERIENCE CONTEXT:\n{context}\n" if context else ""

    return [
        {
            "role": "user",
            "content": f"""Rewrite the following resume bullet point to be more impactful and relevant to the target job.

ORIGINAL BULLET:
{bullet_text}
{context_block}
TARGET JOB DESCRIPTION (excerpt or full):
{job_description[:2000]}

Rules:
1. Keep all facts, dates, technologies, and achievements from the original — do NOT add anything that wasn't there
2. Use strong action verbs (Led, Built, Reduced, Increased, Delivered, etc.)
3. Quantify impact where numbers already exist in the original
4. Mirror relevant keywords from the job description naturally — only if they accurately describe the experience
5. Keep it to 1-2 lines maximum
6. Start with an action verb

Provide:
1. The rewritten bullet
2. A brief rationale (1 sentence) explaining what you changed and why

Format your response as:
REWRITTEN: <the new bullet text>
RATIONALE: <why this wording better matches the role>""",
        }
    ]
