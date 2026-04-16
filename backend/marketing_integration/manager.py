from __future__ import annotations

import logging
from typing import Any

from .providers.base_social import BaseSocialProvider, SocialProviderError
from .providers.pinterest import PinterestProvider

logger = logging.getLogger(__name__)


class SocialProviderNotFoundError(SocialProviderError):
    """Keine Provider-Implementierung für die angegebene Plattform."""


def _registry() -> dict[str, type[BaseSocialProvider]]:
    return {
        "pinterest": PinterestProvider,
    }


class SocialManager:
    """Wählt anhand des Plattformnamens den passenden Social-Provider (Adapter)."""

    @staticmethod
    def get_provider(platform: str, *, access_token: str) -> BaseSocialProvider:
        key = (platform or "").lower().strip()
        reg = _registry()
        cls = reg.get(key)
        if cls is None:
            available = ", ".join(sorted(reg.keys()))
            raise SocialProviderNotFoundError(
                f"Unbekannte Social-Plattform '{platform}'. Verfügbar: {available}"
            )
        return cls(access_token=access_token)

    @staticmethod
    def post_single(
        platform: str,
        *,
        access_token: str,
        post_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Provider instanziieren und einen Post ausführen (synchron)."""
        provider = SocialManager.get_provider(platform, access_token=access_token)
        return provider.post_single(post_data)

    @staticmethod
    def list_boards(platform: str, *, access_token: str) -> list[dict[str, str]]:
        """Boards der Plattform abrufen (derzeit nur Pinterest)."""
        key = (platform or "").lower().strip()
        if key != "pinterest":
            raise SocialProviderNotFoundError(
                f"Boards-Liste für '{platform}' ist nicht implementiert. Verfügbar: pinterest"
            )
        provider = PinterestProvider(access_token=access_token)
        return provider.list_boards()
