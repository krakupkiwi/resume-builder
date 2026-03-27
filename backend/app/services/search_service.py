from app.config import settings


def search_resume_examples(
    role_title: str,
    industry: str | None = None,
    seniority: str | None = None,
    max_results: int = 8,
) -> list[dict]:
    """
    Search the web for resume examples for a given role.
    Returns a list of {title, url, snippet, source} dicts.
    """
    query_parts = [f"{role_title} resume example"]
    if seniority:
        query_parts.insert(0, seniority)
    if industry:
        query_parts.append(industry)
    query = " ".join(query_parts)

    if settings.SEARCH_PROVIDER == "serpapi" and settings.SERPAPI_KEY:
        return _search_serpapi(query, max_results)
    return _search_duckduckgo(query, max_results)


def _search_duckduckgo(query: str, max_results: int) -> list[dict]:
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                    "source": "duckduckgo",
                })
        return results
    except Exception as e:
        return [{"title": "Search unavailable", "url": "", "snippet": str(e), "source": "error"}]


def _search_serpapi(query: str, max_results: int) -> list[dict]:
    try:
        import httpx
        response = httpx.get(
            "https://serpapi.com/search",
            params={"q": query, "api_key": settings.SERPAPI_KEY, "num": max_results},
            timeout=10,
        )
        data = response.json()
        results = []
        for r in data.get("organic_results", []):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("link", ""),
                "snippet": r.get("snippet", ""),
                "source": "serpapi",
            })
        return results
    except Exception as e:
        return [{"title": "Search unavailable", "url": "", "snippet": str(e), "source": "error"}]
