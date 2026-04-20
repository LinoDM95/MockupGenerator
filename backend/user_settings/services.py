"""Sync Hub keys to canonical integration models; provider connectivity checks."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import boto3
import httpx
from botocore.exceptions import ClientError
from django.utils import timezone

from ai_integration.models import AIConnection
from gelato_integration.services import GelatoApiError, GelatoClient
from marketing_integration.models import SocialPlatform

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser

logger = logging.getLogger(__name__)

GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models"
PINTEREST_USER_ACCOUNT_URL = "https://api.pinterest.com/v5/user_account"


def sync_gemini_to_ai_connection(user: AbstractUser, plain_key: str) -> None:
    conn, _ = AIConnection.objects.get_or_create(
        user=user,
        defaults={
            "provider": "gemini",
            "model_name": "gemini-2.5-flash",
        },
    )
    conn.set_api_key(plain_key)
    conn.provider = "gemini"
    conn.is_active = True
    conn.save(
        update_fields=[
            "api_key_enc",
            "provider",
            "is_active",
            "updated_at",
        ]
    )


def sync_gelato_to_connection(user: AbstractUser, plain_key: str) -> None:
    from gelato_integration.models import GelatoConnection

    conn, _ = GelatoConnection.objects.get_or_create(user=user)
    conn.set_api_key(plain_key)
    conn.save(update_fields=["api_key_enc", "updated_at"])


def test_gemini_api_key(api_key: str) -> None:
    key = (api_key or "").strip()
    if not key:
        raise ValueError("Kein Gemini-API-Key gespeichert.")
    with httpx.Client(timeout=20.0) as client:
        r = client.get(GEMINI_MODELS_URL, params={"key": key})
    if r.status_code == 200:
        return
    if r.status_code in (400, 401, 403):
        raise ValueError("Der Gemini-API-Key wurde abgelehnt. Bitte Key prüfen.")
    raise ValueError("Gemini-API ist vorübergehend nicht erreichbar. Bitte später erneut testen.")


def test_gelato_api_key(api_key: str) -> None:
    key = (api_key or "").strip()
    if not key:
        raise ValueError("Kein Gelato-API-Key gespeichert.")
    try:
        with GelatoClient(key) as client:
            client.list_stores()
    except GelatoApiError as e:
        if e.status_code in (401, 403):
            raise ValueError("Der Gelato-API-Key wurde abgelehnt. Bitte Key prüfen.") from e
        raise ValueError("Gelato-API-Fehler. Bitte Key und Netzwerk prüfen.") from e


def test_cloudflare_r2(
    *,
    endpoint_url: str,
    access_key: str,
    secret_key: str,
    bucket_name: str,
) -> None:
    endpoint = (endpoint_url or "").strip()
    access = (access_key or "").strip()
    secret = (secret_key or "").strip()
    bucket = (bucket_name or "").strip()
    if not all([endpoint, access, secret, bucket]):
        raise ValueError("Cloudflare R2: Endpoint, Bucket, Access- und Secret-Key sind erforderlich.")
    try:
        client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access,
            aws_secret_access_key=secret,
        )
        client.head_bucket(Bucket=bucket)
    except ClientError as e:
        code = (e.response.get("Error") or {}).get("Code", "")
        if code in ("403", "404", 403, 404):
            raise ValueError(
                "R2-Zugriff verweigert oder Bucket nicht gefunden. Credentials und Bucket-Namen prüfen."
            ) from e
        raise ValueError("R2-Verbindung fehlgeschlagen. Endpoint und Keys prüfen.") from e


def _pinterest_platform_row(user: AbstractUser) -> SocialPlatform | None:
    return SocialPlatform.objects.filter(
        user=user,
        platform=SocialPlatform.Platform.PINTEREST,
    ).first()


def pinterest_effective_connected_from_row(sp: SocialPlatform | None) -> bool:
    """Status aus bereits geladener Zeile (ein Query weniger im Integrations-Hub)."""
    if not sp:
        return False
    token = sp.get_access_token()
    if not token:
        return False
    if sp.expires_at and sp.expires_at <= timezone.now():
        return False
    return True


def pinterest_effective_connected(user: AbstractUser) -> bool:
    sp = _pinterest_platform_row(user)
    return pinterest_effective_connected_from_row(sp)


def test_pinterest_connection(user: AbstractUser) -> None:
    sp = _pinterest_platform_row(user)
    if not sp:
        raise ValueError(
            "Pinterest ist nicht verbunden. Bitte im Bereich Marketing / Pinterest die OAuth-Verbindung herstellen."
        )
    token = sp.get_access_token()
    if not token:
        raise ValueError("Kein Pinterest-Zugriffstoken. Bitte erneut verbinden.")
    if sp.expires_at and sp.expires_at <= timezone.now():
        raise ValueError("Pinterest-Token ist abgelaufen. Bitte erneut verbinden.")

    headers = {"Authorization": f"Bearer {token}"}
    with httpx.Client(timeout=20.0) as client:
        r = client.get(PINTEREST_USER_ACCOUNT_URL, headers=headers)
    if r.status_code == 200:
        return
    if r.status_code in (401, 403):
        raise ValueError("Pinterest hat den Zugriff verweigert. Bitte erneut verbinden.")
    raise ValueError("Pinterest-API ist vorübergehend nicht erreichbar.")
