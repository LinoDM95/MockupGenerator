"""Per-user BYOK integration storage; secrets encrypted via core.crypto (Fernet).

Production: set TOKEN_ENCRYPTION_KEY in the environment (do not rely on SECRET_KEY derivation).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from core.crypto import decrypt_token, encrypt_token


class UserIntegration(models.Model):
    """Mirrors Hub-stored keys; Gemini/Gelato are synced to canonical models on save."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_integration",
    )
    gemini_api_key_enc = models.TextField(blank=True)
    gelato_api_key_enc = models.TextField(blank=True)
    cloudflare_access_key_enc = models.TextField(blank=True)
    cloudflare_secret_key_enc = models.TextField(blank=True)
    cloudflare_endpoint = models.CharField(max_length=512, blank=True)
    cloudflare_bucket_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"UserIntegration – {self.user_id}"

    def set_gemini_key(self, plain: str) -> None:
        self.gemini_api_key_enc = encrypt_token(plain) if plain else ""

    def get_gemini_key(self) -> str:
        return decrypt_token(self.gemini_api_key_enc) if self.gemini_api_key_enc else ""

    def set_gelato_key(self, plain: str) -> None:
        self.gelato_api_key_enc = encrypt_token(plain) if plain else ""

    def get_gelato_key(self) -> str:
        return decrypt_token(self.gelato_api_key_enc) if self.gelato_api_key_enc else ""

    def set_cloudflare_access_key(self, plain: str) -> None:
        self.cloudflare_access_key_enc = encrypt_token(plain) if plain else ""

    def get_cloudflare_access_key(self) -> str:
        if not self.cloudflare_access_key_enc:
            return ""
        return decrypt_token(self.cloudflare_access_key_enc)

    def set_cloudflare_secret_key(self, plain: str) -> None:
        self.cloudflare_secret_key_enc = encrypt_token(plain) if plain else ""

    def get_cloudflare_secret_key(self) -> str:
        if not self.cloudflare_secret_key_enc:
            return ""
        return decrypt_token(self.cloudflare_secret_key_enc)
