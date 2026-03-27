from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class SettingsResponse(BaseModel):
    AI_PROVIDER: str
    ANTHROPIC_API_KEY: str
    CLAUDE_MODEL: str
    OPENAI_API_KEY: str
    OPENAI_MODEL: str
    OLLAMA_BASE_URL: str
    OLLAMA_MODEL: str


class SettingsUpdate(BaseModel):
    AI_PROVIDER: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    CLAUDE_MODEL: str | None = None
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str | None = None
    OLLAMA_BASE_URL: str | None = None
    OLLAMA_MODEL: str | None = None


class TestResult(BaseModel):
    ok: bool
    message: str


@router.get("", response_model=SettingsResponse)
def get_settings():
    """Return current AI/integration settings (secrets masked)."""
    from app.services.settings_service import get_all_settings
    return get_all_settings()


@router.patch("", response_model=SettingsResponse)
def update_settings(body: SettingsUpdate):
    """Persist updated settings. Takes effect immediately for new AI calls."""
    from app.services.settings_service import update_settings, get_all_settings
    try:
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        update_settings(updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return get_all_settings()


@router.post("/test", response_model=TestResult)
async def test_ai_connection():
    """Send a minimal test message to the configured AI provider."""
    from app.ai.factory import get_ai_provider
    try:
        provider = get_ai_provider()
        response = await provider.complete([{"role": "user", "content": "Reply with exactly: OK"}])
        return TestResult(ok=True, message=f"Connected. Response: {response[:80]}")
    except ValueError as exc:
        return TestResult(ok=False, message=str(exc))
    except Exception as exc:
        return TestResult(ok=False, message=f"Connection failed: {exc}")
