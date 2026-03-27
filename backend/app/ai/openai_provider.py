from typing import AsyncIterator

from openai import AsyncOpenAI

from app.ai.base import AIProvider, TRUTHFULNESS_SYSTEM_PROMPT
from app.config import settings


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str | None = None, model: str | None = None):
        _key = api_key or settings.OPENAI_API_KEY
        if not _key:
            raise ValueError("OPENAI_API_KEY is not set")
        self._client = AsyncOpenAI(api_key=_key)
        self._model = model or settings.OPENAI_MODEL

    async def complete(self, messages: list[dict], **kwargs) -> str:
        full_messages = [{"role": "system", "content": TRUTHFULNESS_SYSTEM_PROMPT}] + [
            m for m in messages if m["role"] != "system"
        ]
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=full_messages,
            max_tokens=kwargs.get("max_tokens", 4096),
        )
        return response.choices[0].message.content or ""

    async def stream(self, messages: list[dict], **kwargs) -> AsyncIterator[str]:
        full_messages = [{"role": "system", "content": TRUTHFULNESS_SYSTEM_PROMPT}] + [
            m for m in messages if m["role"] != "system"
        ]
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=full_messages,
            max_tokens=kwargs.get("max_tokens", 4096),
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
