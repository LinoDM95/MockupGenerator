from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.crypto import decrypt_token, encrypt_token


class SocialPlatform(models.Model):
    """Pro Benutzer eine OAuth-/API-Verknüpfung pro Social-Plattform."""

    class Platform(models.TextChoices):
        PINTEREST = "pinterest", "Pinterest"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_platforms",
    )
    platform = models.CharField(
        max_length=32,
        choices=Platform.choices,
        db_index=True,
    )
    access_token_enc = models.TextField(blank=True)
    refresh_token_enc = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    scopes = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "platform"],
                name="uniq_marketing_socialplatform_user_platform",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} · {self.get_platform_display()}"

    def set_access_token(self, value: str) -> None:
        self.access_token_enc = encrypt_token(value) if value else ""

    def set_refresh_token(self, value: str) -> None:
        self.refresh_token_enc = encrypt_token(value) if value else ""

    def get_access_token(self) -> str:
        if not self.access_token_enc:
            return ""
        return decrypt_token(self.access_token_enc)

    def get_refresh_token(self) -> str:
        if not self.refresh_token_enc:
            return ""
        return decrypt_token(self.refresh_token_enc)


class SocialPost(models.Model):
    """Ein geplanter oder veröffentlichter Social-Post (z. B. Pinterest-Pin)."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Entwurf"
        POSTED = "posted", "Veröffentlicht"
        FAILED = "failed", "Fehlgeschlagen"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_posts",
    )
    social_platform = models.ForeignKey(
        SocialPlatform,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    image_url = models.URLField(max_length=1024)
    title = models.CharField(max_length=512)
    caption = models.TextField(blank=True)
    destination_link = models.URLField(max_length=1024)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    external_pin_id = models.CharField(max_length=64, blank=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.title[:40]} ({self.get_status_display()})"


class PinterestOAuthState(models.Model):
    """Kurzlebiger OAuth-State vor dem Redirect zu Pinterest (CSRF-Schutz)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pinterest_oauth_states",
    )
    state = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at
