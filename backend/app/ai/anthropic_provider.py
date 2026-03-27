from typing import AsyncIterator

import anthropic

from app.ai.base import AIProvider, TRUTHFULNESS_SYSTEM_PROMPT
from app.config import settings


class AnthropicProvider(AIProvider):
    def __init__(self):
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is not set")
        self._client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._model = settings.CLAUDE_MODEL

    async def complete(self, messages: list[dict], **kwargs) -> str:
        # Separate system message from conversation
        system_msg = TRUTHFULNESS_SYSTEM_PROMPT
        user_messages = [m for m in messages if m["role"] != "system"]

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=kwargs.get("max_tokens", 4096),
            system=system_msg,
            messages=user_messages,
        )
        return response.content[0].text

    async def stream(self, messages: list[dict], **kwargs) -> AsyncIterator[str]:
        system_msg = TRUTHFULNESS_SYSTEM_PROMPT
        user_messages = [m for m in messages if m["role"] != "system"]

        async with self._client.messages.stream(
            model=self._model,
            max_tokens=kwargs.get("max_tokens", 4096),
            system=system_msg,
            messages=user_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text
