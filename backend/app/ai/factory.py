from app.ai.base import AIProvider


def get_ai_provider() -> AIProvider:
    from app.services.settings_service import get_runtime_setting

    provider = (get_runtime_setting("AI_PROVIDER") or "claude").lower()
    match provider:
        case "claude" | "anthropic":
            from app.ai.anthropic_provider import AnthropicProvider
            return AnthropicProvider(
                api_key=get_runtime_setting("ANTHROPIC_API_KEY") or None,
                model=get_runtime_setting("CLAUDE_MODEL") or None,
            )
        case "openai":
            from app.ai.openai_provider import OpenAIProvider
            return OpenAIProvider(
                api_key=get_runtime_setting("OPENAI_API_KEY") or None,
                model=get_runtime_setting("OPENAI_MODEL") or None,
            )
        case "ollama":
            from app.ai.ollama_provider import OllamaProvider
            return OllamaProvider(
                base_url=get_runtime_setting("OLLAMA_BASE_URL") or None,
                model=get_runtime_setting("OLLAMA_MODEL") or None,
            )
        case _:
            raise ValueError(
                f"Unknown AI provider: '{provider}'. "
                "Set AI_PROVIDER to one of: claude, openai, ollama"
            )
