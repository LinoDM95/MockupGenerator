from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import urlparse

import httpx
from django.conf import settings

from .base_social import BaseSocialProvider, SocialProviderError

logger = logging.getLogger(__name__)

PINTEREST_API_V5_BASE = "https://api.pinterest.com/v5"

# Pinterest API limits (Stand API v5)
_MAX_TITLE_LEN = 100
_MAX_DESCRIPTION_LEN = 800


def _validate_pin_image_url(url: str) -> None:
    """HTTPS und optional Host-Allowlist (Missbrauchsschutz für frei wählbare URLs)."""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise SocialProviderError(
            "Die Bild-URL muss mit HTTPS beginnen (öffentlich erreichbar für Pinterest)."
        )
    host = (parsed.hostname or "").lower()
    if not host:
        raise SocialProviderError("Die Bild-URL ist ungültig (kein Hostname).")

    allowed = getattr(settings, "MARKETING_PIN_IMAGE_URL_ALLOWED_HOSTS", None) or []
    if allowed and host not in allowed:
        raise SocialProviderError(
            "Der Host der Bild-URL ist nicht in der erlaubten Liste konfiguriert "
            f"(MARKETING_PIN_IMAGE_URL_ALLOWED_HOSTS). Host: {host}"
        )


def _truncate(s: str, max_len: int) -> str:
    s = (s or "").strip()
    if len(s) <= max_len:
        return s
    return s[: max_len - 1].rstrip() + "…"


class PinterestProvider(BaseSocialProvider):
    """Pinterest API v5: Pin mit Bild-URL (Pinterest lädt das Bild selbst)."""

    def __init__(self, access_token: str) -> None:
        token = (access_token or "").strip()
        if not token:
            raise SocialProviderError(
                "Kein Pinterest-Zugriffstoken konfiguriert. Bitte Pinterest verbinden."
            )
        self._access_token = token

    def post_single(self, post_data: dict[str, Any]) -> dict[str, Any]:
        board_id = post_data.get("board_id")
        if not board_id or not str(board_id).strip():
            raise SocialProviderError("Pinterest: board_id ist erforderlich.")

        image_url = post_data.get("image_url") or post_data.get("imageUrl")
        if not image_url or not isinstance(image_url, str):
            raise SocialProviderError("Pinterest: image_url ist erforderlich.")
        image_url = image_url.strip()
        _validate_pin_image_url(image_url)

        title = _truncate(str(post_data.get("title") or ""), _MAX_TITLE_LEN)
        if not title:
            raise SocialProviderError("Pinterest: title ist erforderlich.")

        description = _truncate(
            str(post_data.get("description") or post_data.get("caption") or ""),
            _MAX_DESCRIPTION_LEN,
        )

        link = post_data.get("link") or post_data.get("destination_link") or ""
        link = str(link).strip() if link else ""

        body: dict[str, Any] = {
            "board_id": str(board_id).strip(),
            "title": title,
            "description": description,
            "media_source": {
                "source_type": "image_url",
                "url": image_url,
            },
        }
        if link:
            body["link"] = link

        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=120.0) as client:
                r = client.post(
                    f"{PINTEREST_API_V5_BASE}/pins",
                    headers=headers,
                    json=body,
                )
        except httpx.RequestError as e:
            logger.warning("Pinterest Netzwerkfehler: %s", e)
            raise SocialProviderError(
                "Pinterest ist vorübergehend nicht erreichbar. Bitte später erneut versuchen."
            ) from e

        if r.status_code in (200, 201):
            try:
                data = r.json()
            except json.JSONDecodeError:
                logger.error("Pinterest: leere oder ungültige JSON-Antwort")
                raise SocialProviderError(
                    "Pinterest hat eine ungültige Antwort gesendet."
                )
            pin_id = data.get("id") or data.get("pin_id")
            return {"pin_id": str(pin_id) if pin_id is not None else "", "raw": data}

        detail = _pinterest_error_message(r)
        logger.warning(
            "Pinterest Pin-Erstellung fehlgeschlagen: HTTP %s — %s",
            r.status_code,
            detail[:500],
        )
        raise SocialProviderError(detail)

    def list_boards(self) -> list[dict[str, str]]:
        """Alle Boards des Nutzers (paginiert über bookmark)."""
        headers = {"Authorization": f"Bearer {self._access_token}"}
        out: list[dict[str, str]] = []
        bookmark: str | None = None
        try:
            with httpx.Client(timeout=120.0) as client:
                while True:
                    params: dict[str, Any] = {"page_size": 100}
                    if bookmark:
                        params["bookmark"] = bookmark
                    r = client.get(
                        f"{PINTEREST_API_V5_BASE}/boards",
                        headers=headers,
                        params=params,
                    )
                    if r.status_code != 200:
                        detail = _pinterest_error_message(r)
                        logger.warning(
                            "Pinterest Boards-Liste fehlgeschlagen: HTTP %s — %s",
                            r.status_code,
                            detail[:500],
                        )
                        raise SocialProviderError(detail)
                    try:
                        data = r.json()
                    except json.JSONDecodeError:
                        raise SocialProviderError(
                            "Pinterest hat eine ungültige JSON-Antwort für Boards gesendet."
                        ) from None
                    items = data.get("items") if isinstance(data, dict) else None
                    if not isinstance(items, list):
                        break
                    for it in items:
                        if not isinstance(it, dict):
                            continue
                        bid = it.get("id")
                        name = it.get("name")
                        if bid is None:
                            continue
                        out.append({"id": str(bid), "name": str(name or "")})
                    bookmark = (
                        data.get("bookmark") if isinstance(data, dict) else None
                    )
                    if not bookmark or not isinstance(bookmark, str):
                        break
        except httpx.RequestError as e:
            logger.warning("Pinterest Netzwerkfehler (boards): %s", e)
            raise SocialProviderError(
                "Pinterest ist vorübergehend nicht erreichbar. Bitte später erneut versuchen."
            ) from e
        return out


def _pinterest_error_message(response: httpx.Response) -> str:
    """Nutzerlesbare Fehlermeldung aus Pinterest JSON oder Roh-Body."""
    try:
        payload = response.json()
    except json.JSONDecodeError:
        text = (response.text or "").strip()
        if text:
            return f"Pinterest-Fehler (HTTP {response.status_code}): {text[:800]}"
        return f"Pinterest-Fehler ohne Details (HTTP {response.status_code})."

    if isinstance(payload, dict):
        msg = payload.get("message")
        if isinstance(msg, str) and msg.strip():
            code = payload.get("code")
            suffix = f" (Code {code})" if code is not None else ""
            return f"Pinterest: {msg.strip()}{suffix}"
        err = payload.get("error") or payload.get("error_description")
        if isinstance(err, str) and err.strip():
            return f"Pinterest: {err.strip()}"
        if "details" in payload and isinstance(payload["details"], list):
            parts = []
            for item in payload["details"][:5]:
                if isinstance(item, dict):
                    m = item.get("message") or item.get("reason")
                    if isinstance(m, str):
                        parts.append(m)
            if parts:
                return "Pinterest: " + " ".join(parts)[:800]

    return f"Pinterest-Fehler (HTTP {response.status_code})."
