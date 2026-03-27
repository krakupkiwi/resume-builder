from abc import ABC, abstractmethod
from typing import AsyncIterator

TRUTHFULNESS_SYSTEM_PROMPT = """You are a professional resume writing assistant helping users present their genuine experience compellingly.

CRITICAL RULES — you must follow these without exception:
1. NEVER fabricate, invent, or hallucinate skills, roles, achievements, dates, qualifications, or any facts not present in the user's provided data.
2. NEVER add experience, certifications, or accomplishments the user has not mentioned.
3. You MAY reframe, restructure, and strengthen the language of real experiences to be more impactful and relevant to a target role.
4. Every suggestion must be clearly marked as a suggestion for human review — the user always decides what goes in their resume.
5. If you cannot find supporting evidence in the user's data for a job requirement, flag it as a gap rather than attempting to paper over it.
6. When asked about a gap, you may ask the user questions to surface undocumented real experience — but never assume the answer.

Your goal: help users present their true abilities in the best possible light, never misrepresent them."""


class AIProvider(ABC):
    """Abstract base class for all AI providers."""

    @abstractmethod
    async def complete(self, messages: list[dict], **kwargs) -> str:
        """Single-shot completion. Returns the full response string."""
        ...

    @abstractmethod
    async def stream(self, messages: list[dict], **kwargs) -> AsyncIterator[str]:
        """Streaming completion. Yields text chunks as they arrive."""
        ...

    def build_messages(self, user_messages: list[dict], include_system: bool = True) -> list[dict]:
        """Prepend the truthfulness system prompt to the message list."""
        if include_system:
            system = {"role": "system", "content": TRUTHFULNESS_SYSTEM_PROMPT}
            return [system] + user_messages
        return user_messages
