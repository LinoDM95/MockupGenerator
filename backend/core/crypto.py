"""Shared Fernet encryption for sensitive data (OWASP A02)."""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet_key_bytes() -> bytes:
    env_key = (getattr(settings, "TOKEN_ENCRYPTION_KEY", None) or "").strip()
    if env_key:
        return env_key.encode()
    raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(raw)


def _fernet() -> Fernet:
    return Fernet(_fernet_key_bytes())


def encrypt_token(plain: str) -> str:
    if not plain:
        return ""
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_token(blob: str) -> str:
    if not blob:
        return ""
    try:
        return _fernet().decrypt(blob.encode()).decode()
    except InvalidToken as e:
        raise ValueError("Token konnte nicht entschlüsselt werden.") from e
