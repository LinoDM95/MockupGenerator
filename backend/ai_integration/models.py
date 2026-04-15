from django.conf import settings
from django.db import models

from core.crypto import decrypt_token, encrypt_token

PROVIDER_CHOICES = [
    ("gemini", "Google Gemini"),
]

MODEL_CHOICES = [
    # Stable
    ("gemini-2.5-flash", "Gemini 2.5 Flash"),
    ("gemini-2.5-pro", "Gemini 2.5 Pro"),
    ("gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite"),
    ("gemini-2.0-flash-lite", "Gemini 2.0 Flash Lite"),
    # Preview (next-gen)
    ("gemini-3-flash-preview", "Gemini 3 Flash (Preview)"),
    ("gemini-3-pro-preview", "Gemini 3 Pro (Preview)"),
    ("gemini-3.1-pro-preview", "Gemini 3.1 Pro (Preview)"),
]


class AIConnection(models.Model):
    """Per-user AI provider connection with encrypted API key storage."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_connection",
    )
    provider = models.CharField(
        max_length=32,
        choices=PROVIDER_CHOICES,
        default="gemini",
    )
    api_key_enc = models.TextField(blank=True)
    service_account_json_enc = models.TextField(
        blank=True,
        help_text="Encrypted GCP service account JSON for Vertex AI Imagen upscaler (BYOK).",
    )
    model_name = models.CharField(
        max_length=64,
        choices=MODEL_CHOICES,
        default="gemini-2.5-flash",
    )
    use_grounding = models.BooleanField(default=False)
    prefer_expert_mode = models.BooleanField(
        default=False,
        help_text="Default: Multi-Agent Listing (Scout/Kritiker/Editor) statt Einzel-Prompt.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"AI – {self.user} ({self.provider}/{self.model_name})"

    def set_api_key(self, plain: str) -> None:
        self.api_key_enc = encrypt_token(plain) if plain else ""

    def get_api_key(self) -> str:
        return decrypt_token(self.api_key_enc) if self.api_key_enc else ""

    def set_service_account_json(self, plain: str) -> None:
        self.service_account_json_enc = encrypt_token(plain) if plain else ""

    def get_service_account_json(self) -> str:
        return (
            decrypt_token(self.service_account_json_enc)
            if self.service_account_json_enc
            else ""
        )
