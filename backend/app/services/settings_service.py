"""
Runtime settings store.

Reads configuration from /data/app_settings.json (volume-persisted), falling back
to environment variables / .env file values. Writes persist only to the JSON file —
the .env file is never modified.

This lets users configure AI providers and API keys from the web UI without
restarting the container.
"""

import json
import os
from pathlib import Path

from app.config import settings

_SETTINGS_FILE = Path(os.getenv("STORAGE_PATH", "/data")) / "app_settings.json"

# Keys that can be read/written via the settings API
CONFIGURABLE_KEYS = {
    "AI_PROVIDER",
    "ANTHROPIC_API_KEY",
    "CLAUDE_MODEL",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OLLAMA_BASE_URL",
    "OLLAMA_MODEL",
}

# Keys whose values should be masked in API responses
SECRET_KEYS = {"ANTHROPIC_API_KEY", "OPENAI_API_KEY"}


def _load_overrides() -> dict:
    """Load JSON overrides file, returning empty dict on any error."""
    try:
        if _SETTINGS_FILE.exists():
            return json.loads(_SETTINGS_FILE.read_text())
    except Exception:
        pass
    return {}


def _save_overrides(data: dict) -> None:
    _SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _SETTINGS_FILE.write_text(json.dumps(data, indent=2))


def get_runtime_setting(key: str) -> str:
    """
    Get the effective value for a setting key.
    JSON overrides take precedence over environment/pydantic values.
    """
    overrides = _load_overrides()
    if key in overrides and overrides[key]:
        return overrides[key].strip()
    return (getattr(settings, key, "") or "").strip()


def get_all_settings() -> dict:
    """
    Return all configurable settings.
    Secret keys are masked: only the last 4 characters are shown.
    """
    overrides = _load_overrides()
    result = {}
    for key in CONFIGURABLE_KEYS:
        raw = overrides.get(key) or getattr(settings, key, "") or ""
        if key in SECRET_KEYS and raw:
            result[key] = f"sk-...{raw[-4:]}" if len(raw) > 4 else "sk-***"
        else:
            result[key] = raw
    return result


def update_settings(updates: dict) -> None:
    """
    Persist setting updates to the JSON file.
    - Masked values (containing "...") are ignored (user didn't change them).
    - Empty string clears a previously stored override.
    """
    current = _load_overrides()
    for key, value in updates.items():
        if key not in CONFIGURABLE_KEYS:
            raise ValueError(f"Non-configurable key: {key}")
        if value is None or value == "":
            current.pop(key, None)  # clear override — fall back to env
        elif "..." in value:
            pass  # masked placeholder — skip
        else:
            current[key] = value.strip()
    _save_overrides(current)
