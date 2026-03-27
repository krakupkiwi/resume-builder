def search_resume_examples_task(
    role_title: str,
    industry: str | None,
    seniority: str | None,
) -> list[dict]:
    """Search the web for resume examples for a given role."""
    from app.services.search_service import search_resume_examples
    return search_resume_examples(role_title=role_title, industry=industry, seniority=seniority)
