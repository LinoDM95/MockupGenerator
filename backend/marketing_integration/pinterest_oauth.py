"""Pinterest OAuth2 (Authorization Code) — Token-Austausch."""

from __future__ import annotations

import base64
import logging
from typing import Any

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"


def _require_pinterest_config() -> None:
    if not getattr(settings, "PINTEREST_APP_ID", None) or not getattr(
        settings, "PINTEREST_APP_SECRET", None
    ):
        raise ValueError(
            "PINTEREST_APP_ID und PINTEREST_APP_SECRET müssen in der Umgebung gesetzt sein."
        )
    if not getattr(settings, "PINTEREST_REDIRECT_URI", None):
        raise ValueError("PINTEREST_REDIRECT_URI muss gesetzt sein.")


def exchange_authorization_code(*, code: str, redirect_uri: str) -> dict[str, Any]:
    """Tauscht den Authorization Code gegen Access- und Refresh-Token."""
    _require_pinterest_config()
    app_id = settings.PINTEREST_APP_ID.strip()
    secret = settings.PINTEREST_APP_SECRET.strip()
    basic = base64.b64encode(f"{app_id}:{secret}".encode()).decode()

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }

    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(
                PINTEREST_TOKEN_URL,
                headers={
                    "Authorization": f"Basic {basic}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data=data,
            )
    except httpx.RequestError as e:
        logger.warning("Pinterest token request network error: %s", e)
        raise ValueError(
            "Pinterest ist vorübergehend nicht erreichbar. Bitte später erneut versuchen."
        ) from e

    if r.status_code != 200:
        detail = r.text[:800] if r.text else f"HTTP {r.status_code}"
        logger.warning("Pinterest token exchange failed: %s", detail)
        raise ValueError(
            f"Pinterest-Token-Austausch fehlgeschlagen: {detail}"
        )

    try:
        return r.json()
    except Exception as e:
        raise ValueError("Pinterest hat keine gültige JSON-Antwort gesendet.") from e
