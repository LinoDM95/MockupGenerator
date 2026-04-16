from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class SocialProviderError(Exception):
    """Fehler bei einem Social-Platform-API-Aufruf (validierbar, nutzerlesbar)."""


class BaseSocialProvider(ABC):
    """Adapter-Basisklasse für einzelne Posts (Pinterest, später weitere Plattformen)."""

    @abstractmethod
    def post_single(self, post_data: dict[str, Any]) -> dict[str, Any]:
        """Einen Post bei der Plattform anlegen.

        Parameters
        ----------
        post_data
            Plattformspezifische Felder (z. B. ``board_id``, ``image_url``, ``title``,
            ``description``, ``link``).

        Returns
        -------
        dict
            Mindestens plattform-spezifische IDs, z. B. ``{"pin_id": "...", "raw": {...}}``.
        """
        raise NotImplementedError
