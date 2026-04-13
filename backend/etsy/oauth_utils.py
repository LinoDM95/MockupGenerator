"""OAuth2 PKCE-Helfer für Etsy (RFC 7636, S256)."""

from __future__ import annotations

import base64
import hashlib
import secrets


def generate_code_verifier(length: int = 64) -> str:
    """43–128 Zeichen URL-sicher; Etsy verlangt PKCE."""
    raw = secrets.token_urlsafe(length)[: length]
    return raw.rstrip("=")


def code_challenge_s256(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def generate_oauth_state() -> str:
    return secrets.token_urlsafe(32)
