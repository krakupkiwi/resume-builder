from app.ai.base import AIProvider
from app.config import settings


def get_ai_provider() -> AIProvider:
    provider = settings.AI_PROVIDER.lower()
    match provider:
        case "claude" | "anthropic":
            from app.ai.anthropic_provider import AnthropicProvider
            return AnthropicProvider()
        case "openai":
            from app.ai.openai_provider import OpenAIProvider
            return OpenAIProvider()
        case "ollama":
            from app.ai.ollama_provider import OllamaProvider
            return OllamaProvider()
        case _:
            raise ValueError(
                f"Unknown AI provider: '{provider}'. "
                "Set AI_PROVIDER to one of: claude, openai, ollama"
            )
