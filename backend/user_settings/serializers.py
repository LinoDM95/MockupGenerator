from __future__ import annotations

from typing import Any

from django.core.validators import URLValidator
from rest_framework import serializers

from .models import UserIntegration

_INTEGRATION_CHOICES = ("gemini", "gelato", "cloudflare_r2")
_PROVIDER_CHOICES = ("gemini", "gelato", "cloudflare_r2", "pinterest")


def _validate_https_url(value: str) -> str:
    v = (value or "").strip()
    if not v:
        raise serializers.ValidationError("Dieses Feld ist erforderlich.")
    URLValidator(schemes=("https",))(v)
    return v


class IntegrationsStatusSerializer(serializers.Serializer):
    """Read-only booleans for GET /integrations/."""

    etsy = serializers.BooleanField()
    gemini = serializers.BooleanField()
    gelato = serializers.BooleanField()
    vertex = serializers.BooleanField()
    cloudflare_r2 = serializers.BooleanField()
    pinterest = serializers.BooleanField()


class IntegrationSaveSerializer(serializers.Serializer):
    integration = serializers.ChoiceField(choices=[(x, x) for x in _INTEGRATION_CHOICES])
    payload = serializers.DictField(allow_empty=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        integration = attrs["integration"]
        payload = attrs["payload"]
        if integration == "gemini":
            key = payload.get("api_key")
            if not key or not str(key).strip():
                raise serializers.ValidationError({"payload": "api_key ist erforderlich."})
        elif integration == "gelato":
            key = payload.get("api_key")
            if not key or not str(key).strip():
                raise serializers.ValidationError({"payload": "api_key ist erforderlich."})
        elif integration == "cloudflare_r2":
            required = ("access_key", "secret_key", "endpoint", "bucket_name")
            missing = [k for k in required if not (payload.get(k) or "").strip()]
            if missing:
                raise serializers.ValidationError(
                    {"payload": f"Fehlend: {', '.join(missing)}"}
                )
            _validate_https_url(str(payload["endpoint"]))
        return attrs


class IntegrationTestSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=[(x, x) for x in _PROVIDER_CHOICES])


def upsert_user_integration(user) -> UserIntegration:
    obj, _ = UserIntegration.objects.get_or_create(user=user)
    return obj
