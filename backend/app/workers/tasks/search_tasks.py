from app.workers.celery_app import celery_app


@celery_app.task(name="search.resume_examples", bind=True)
def search_resume_examples_task(
    self,
    role_title: str,
    industry: str | None,
    seniority: str | None,
) -> list[dict]:
    """Search the web for resume examples for a given role."""
    from app.services.search_service import search_resume_examples
    return search_resume_examples(role_title=role_title, industry=industry, seniority=seniority)
