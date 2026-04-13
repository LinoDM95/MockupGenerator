"""
HTTP-Client für Etsy Open API v3 + OAuth-Token-Endpoint.
Ratenlimit, 429-Retry, einmaliger Token-Refresh bei 401.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from django.conf import settings

from .rate_limit import EtsyRateLimiter

logger = logging.getLogger(__name__)

TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token"
OPENAPI_PREFIX = "https://openapi.etsy.com/v3/application"


def exchange_authorization_code(
    *,
    code: str,
    redirect_uri: str,
    code_verifier: str,
) -> dict[str, Any]:
    data = {
        "grant_type": "authorization_code",
        "client_id": settings.ETSY_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "code": code,
        "code_verifier": code_verifier,
    }
    if settings.ETSY_CLIENT_SECRET:
        data["client_secret"] = settings.ETSY_CLIENT_SECRET
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        r.raise_for_status()
        return r.json()


def refresh_access_token(*, refresh_token: str) -> dict[str, Any]:
    data = {
        "grant_type": "refresh_token",
        "client_id": settings.ETSY_CLIENT_ID,
        "refresh_token": refresh_token,
    }
    if settings.ETSY_CLIENT_SECRET:
        data["client_secret"] = settings.ETSY_CLIENT_SECRET
    with httpx.Client(timeout=60.0) as client:
        r = client.post(
            TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        r.raise_for_status()
        return r.json()


class EtsyOpenApiClient:
    def __init__(self, access_token: str, rate_limiter: EtsyRateLimiter | None = None) -> None:
        self._access_token = access_token
        self._limiter = rate_limiter or EtsyRateLimiter(settings.ETSY_API_RPS)
        self._client = httpx.Client(
            base_url=OPENAPI_PREFIX,
            headers={
                "Authorization": f"Bearer {access_token}",
                "x-api-key": settings.ETSY_CLIENT_ID,
            },
            timeout=120.0,
        )

    def close(self) -> None:
        self._client.close()

    def _request(
        self,
        method: str,
        path: str,
        *,
        refresh_fn: Any | None = None,
        max_retries: int = 6,
        **kwargs: Any,
    ) -> httpx.Response:
        last_exc: Exception | None = None
        did_refresh = False
        for attempt in range(max_retries):
            self._limiter.wait()
            try:
                r = self._client.request(method, path, **kwargs)
            except httpx.RequestError as e:
                last_exc = e
                time.sleep(min(2**attempt, 30))
                continue

            if r.status_code == 401 and refresh_fn and not did_refresh:
                try:
                    new_token = refresh_fn()
                    self._access_token = new_token
                    self._client.headers["Authorization"] = f"Bearer {new_token}"
                    did_refresh = True
                except Exception as e:
                    logger.warning("Etsy token refresh failed: %s", e)
                    return r
                continue

            if r.status_code == 429:
                ra = r.headers.get("Retry-After")
                try:
                    delay = float(ra) if ra else min(2**attempt, 60)
                except (TypeError, ValueError):
                    delay = min(2**attempt, 60)
                time.sleep(delay)
                continue

            return r

        if last_exc:
            raise last_exc
        raise RuntimeError("Etsy request failed after retries")

    def get_json(self, path: str, *, refresh_fn: Any | None = None, **kwargs: Any) -> Any:
        r = self._request("GET", path, refresh_fn=refresh_fn, **kwargs)
        r.raise_for_status()
        return r.json()

    def delete(self, path: str, *, refresh_fn: Any | None = None) -> httpx.Response:
        r = self._request("DELETE", path, refresh_fn=refresh_fn)
        return r

    def post_multipart(
        self,
        path: str,
        *,
        files: dict[str, Any],
        data: dict[str, Any],
        refresh_fn: Any | None = None,
    ) -> httpx.Response:
        r = self._request("POST", path, files=files, data=data, refresh_fn=refresh_fn)
        return r
