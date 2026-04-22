from __future__ import annotations

import json
import os

from rest_framework import serializers

from .models import AIConnection, MODEL_CHOICES, PROVIDER_CHOICES


class AIConnectSerializer(serializers.Serializer):
    api_key = serializers.CharField(min_length=10, max_length=512)
    model_name = serializers.ChoiceField(
        choices=[c[0] for c in MODEL_CHOICES],
        default="gemini-2.5-flash",
    )
    provider = serializers.ChoiceField(
        choices=[c[0] for c in PROVIDER_CHOICES],
        default="gemini",
        required=False,
    )


class AIUpdateModelSerializer(serializers.Serializer):
    model_name = serializers.ChoiceField(
        choices=[c[0] for c in MODEL_CHOICES],
        required=False,
    )
    use_grounding = serializers.BooleanField(required=False)
    prefer_expert_mode = serializers.BooleanField(required=False)


class AIVertexServiceAccountSerializer(serializers.Serializer):
    """GCP service account JSON for Vertex AI Imagen upscaler (BYOK)."""

    service_account_json = serializers.CharField(
        allow_blank=True,
        required=True,
        max_length=65535,
        trim_whitespace=False,
    )

    def validate_service_account_json(self, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            return ""
        try:
            data = json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError(
                "Ungueltiges JSON. Bitte die komplette .json-Datei einfuegen."
            ) from exc
        if not isinstance(data, dict):
            raise serializers.ValidationError("Erwartet wird ein JSON-Objekt.")
        if data.get("type") != "service_account":
            raise serializers.ValidationError(
                'Erwartet wird type: "service_account" (Google-Dienstkonto-Key).'
            )
        for key in ("project_id", "private_key", "client_email"):
            if not data.get(key):
                raise serializers.ValidationError(
                    f"Pflichtfeld fehlt oder ist leer: {key}"
                )
        return stripped


class AIConnectionStatusSerializer(serializers.ModelSerializer):
    connected = serializers.SerializerMethodField()
    vertex_upscaler_configured = serializers.SerializerMethodField()
    replicate_upscale_configured = serializers.SerializerMethodField()

    class Meta:
        model = AIConnection
        fields = (
            "connected",
            "vertex_upscaler_configured",
            "replicate_upscale_configured",
            "provider",
            "model_name",
            "use_grounding",
            "prefer_expert_mode",
            "is_active",
            "created_at",
        )
        read_only_fields = fields

    def get_connected(self, obj: AIConnection) -> bool:
        return bool(obj.api_key_enc and obj.is_active)

    def get_vertex_upscaler_configured(self, obj: AIConnection) -> bool:
        return bool(obj.service_account_json_enc and obj.is_active)

    def get_replicate_upscale_configured(self, _obj: AIConnection) -> bool:
        return bool((os.environ.get("REPLICATE_API_TOKEN") or "").strip())
