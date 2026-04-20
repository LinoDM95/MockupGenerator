"""Gemeinsame Test-Hilfen für alle Django-Apps (Bearer-JWT, Testnutzer, kleine Fixtures).

Import: ``from core.tests.support import api_client_bearer, create_user, …``
"""

from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def create_user(
    *,
    username: str = "testuser",
    password: str = "testpass123",
    email: str = "test@example.com",
) -> User:
    return User.objects.create_user(
        username=username,
        password=password,
        email=email,
    )


def api_client_bearer(user: User) -> APIClient:
    client = APIClient()
    token = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
    return client


def minimal_png_bytes() -> bytes:
    """1x1 PNG — passes Pillow validate_real_image."""
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x01\x01\x01\x00\x18\xdd\x89\x1c\x00\x00\x00\x00IEND\xaeB`\x82"
    )
