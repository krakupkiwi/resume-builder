from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "sqlite:////data/resume_builder.db"

    # AI Provider
    AI_PROVIDER: str = "claude"  # claude | openai | ollama
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-opus-4-5"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"

    # Storage
    STORAGE_PATH: str = "/data/files"

    # Web Search
    SEARCH_PROVIDER: str = "duckduckgo"  # duckduckgo | serpapi
    SERPAPI_KEY: str = ""

    # App
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = False


settings = Settings()
