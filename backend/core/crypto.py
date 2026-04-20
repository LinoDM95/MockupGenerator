"""Shared Fernet encryption for sensitive data (OWASP A02)."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet_key_bytes() -> bytes:
    env_key = (getattr(settings, "TOKEN_ENCRYPTION_KEY", None) or "").strip()
    if not env_key:
        raise RuntimeError(
            "TOKEN_ENCRYPTION_KEY is not set. "
            "Generate with: python -c \"from cryptography.fernet import Fernet; "
            'print(Fernet.generate_key().decode())"'
        )
    try:
        Fernet(env_key.encode())
    except Exception as exc:
        raise RuntimeError("TOKEN_ENCRYPTION_KEY is not a valid Fernet key.") from exc
    return env_key.encode()


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
