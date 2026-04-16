from __future__ import annotations

import logging
from typing import Any

from .base import AIProviderError, BaseAIProvider
from .gemini import GeminiProvider

logger = logging.getLogger(__name__)


class ProviderNotFoundError(AIProviderError):
    """Raised when the configured provider name has no matching implementation."""


def _get_provider_registry() -> dict[str, type[BaseAIProvider]]:
    """Lazy registry so imports only happen when actually needed."""
    from .gemini import GeminiProvider

    return {
        "gemini": GeminiProvider,
    }


class AIManager:
    """Factory that instantiates an AI provider with per-user credentials.

    Usage::

        result = AIManager("gemini", api_key, "gemini-2.5-flash").generate(...)
    """

    def __init__(
        self,
        provider_name: str,
        api_key: str,
        model_name: str,
    ) -> None:
        provider_name = provider_name.lower().strip()

        registry = _get_provider_registry()
        provider_cls = registry.get(provider_name)

        if provider_cls is None:
            available = ", ".join(sorted(registry.keys()))
            raise ProviderNotFoundError(
                f"Unbekannter AI-Provider '{provider_name}'. "
                f"Verfügbar: {available}"
            )

        self._provider: BaseAIProvider = provider_cls(
            api_key=api_key,
            model_name=model_name,
        )
        logger.debug("AI provider initialised: %s / %s", provider_name, model_name)

    def generate(
        self,
        image_file: Any,
        context_text: str,
        target_type: str = "all",
        style_reference: str = "",
        use_grounding: bool = False,
    ) -> dict:
        """Delegate to the active provider's ``generate_listing_data``."""
        return self._provider.generate_listing_data(
            image_file=image_file,
            context_text=context_text,
            target_type=target_type,
            style_reference=style_reference,
            use_grounding=use_grounding,
        )

    def expert_listing_step(
        self,
        step: int,
        image_file: Any | None,
        context_text: str,
        target_type: str = "all",
        style_reference: str = "",
        use_grounding: bool = False,
        scout_data: dict | None = None,
        critic_data: dict | None = None,
    ) -> dict[str, Any]:
        """Run one expert-debate step (Gemini only)."""
        if target_type.lower().strip() == "social_caption":
            raise AIProviderError(
                "Expert-Modus unterstützt target 'social_caption' nicht."
            )
        if not isinstance(self._provider, GeminiProvider):
            raise AIProviderError(
                "Expert-Modus ist nur mit dem Gemini-Provider verfügbar."
            )
        gemini: GeminiProvider = self._provider
        if step == 1:
            if image_file is None:
                raise AIProviderError("Expert-Schritt 1 erfordert ein Bild.")
            return gemini.expert_step_1_scout(
                image_file=image_file,
                context_text=context_text,
                target_type=target_type,
                style_reference=style_reference,
                use_grounding=use_grounding,
            )
        if step == 2:
            if scout_data is None:
                raise AIProviderError("Expert-Schritt 2 erfordert scout_payload.")
            return gemini.expert_step_2_critic(
                scout_data=scout_data,
                context_text=context_text,
                use_grounding=use_grounding,
            )
        if step == 3:
            if scout_data is None or critic_data is None:
                raise AIProviderError(
                    "Expert-Schritt 3 erfordert scout_payload und critic_payload."
                )
            return gemini.expert_step_3_editor(
                scout_data=scout_data,
                critic_data=critic_data,
                context_text=context_text,
                use_grounding=use_grounding,
            )
        raise AIProviderError(f"Ungültiger Expert-Schritt: {step}")
