from typing import AsyncIterator
import json

import httpx

from app.ai.base import AIProvider, TRUTHFULNESS_SYSTEM_PROMPT
from app.config import settings


class OllamaProvider(AIProvider):
    def __init__(self, base_url: str | None = None, model: str | None = None):
        self._base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self._model = model or settings.OLLAMA_MODEL

    async def complete(self, messages: list[dict], **kwargs) -> str:
        full_messages = [{"role": "system", "content": TRUTHFULNESS_SYSTEM_PROMPT}] + [
            m for m in messages if m["role"] != "system"
        ]
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{self._base_url}/api/chat",
                json={"model": self._model, "messages": full_messages, "stream": False},
            )
            response.raise_for_status()
            return response.json()["message"]["content"]

    async def stream(self, messages: list[dict], **kwargs) -> AsyncIterator[str]:
        full_messages = [{"role": "system", "content": TRUTHFULNESS_SYSTEM_PROMPT}] + [
            m for m in messages if m["role"] != "system"
        ]
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/api/chat",
                json={"model": self._model, "messages": full_messages, "stream": True},
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
