import uuid
from typing import Any

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import serializers

from .models import Template, TemplateElement, TemplateSet

ALLOWED_ELEMENT_TYPES = {c[0] for c in TemplateElement.ELEMENT_TYPES}


class TemplateElementSerializer(serializers.ModelSerializer):
    """Liest/schreibt ein Element im Prototyp-Format { id, type, ...payload }."""

    class Meta:
        model = TemplateElement
        fields = ("id", "element_type", "order", "payload")

    def to_representation(self, instance: TemplateElement) -> dict[str, Any]:
        data = dict(instance.payload or {})
        data["id"] = str(instance.id)
        data["type"] = instance.element_type
        return data

    @staticmethod
    def split_element_dict(
        raw: dict[str, Any],
        order: int,
        *,
        regenerate_element_ids: bool = False,
    ) -> tuple[uuid.UUID, str, dict[str, Any]]:
        el_type = raw.get("type") or raw.get("element_type")
        if el_type not in ALLOWED_ELEMENT_TYPES:
            raise serializers.ValidationError(f"Unbekannter Element-Typ: {el_type}")
        if regenerate_element_ids:
            pk = uuid.uuid4()
        else:
            el_id = raw.get("id")
            pk: uuid.UUID
            if not el_id:
                pk = uuid.uuid4()
            else:
                try:
                    pk = uuid.UUID(str(el_id))
                except (ValueError, TypeError):
                    # Frontend/Prototyp-IDs wie "el_123…" sind keine UUIDs — neue ID vergeben.
                    pk = uuid.uuid4()
        payload = {k: v for k, v in raw.items() if k not in ("id", "type", "element_type")}
        return pk, str(el_type), payload


class TemplateSerializer(serializers.ModelSerializer):
    """Vorlage inkl. Elemente; `bgImage` entspricht der URL des Hintergrundbildes."""

    elements = serializers.SerializerMethodField()
    bgImage = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Template
        fields = (
            "id",
            "name",
            "width",
            "height",
            "bgImage",
            "elements",
            "order",
            "default_frame_style",
            "frame_shadow_outer_enabled",
            "frame_shadow_inner_enabled",
            "frame_outer_sides",
            "frame_inner_sides",
            "frame_shadow_depth",
            "artwork_saturation",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "bgImage", "elements", "created_at", "updated_at")

    def get_bgImage(self, obj: Template) -> str | None:
        if not obj.background_image:
            return None
        request = self.context.get("request")
        # Export: öffentliche Storage-URL, damit Import (serverseitiger httpx) ohne Session funktioniert.
        if self.context.get("export_background_urls"):
            url = obj.background_image.url
            if url.startswith(("http://", "https://")):
                return url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        # App / Canvas: same-origin-Proxy — vermeidet R2-CORS bei crossOrigin="anonymous".
        if request is not None:
            return reverse("template-background", kwargs={"pk": obj.pk})
        url = obj.background_image.url
        if url.startswith(("http://", "https://")):
            return url
        return url

    def get_elements(self, obj: Template) -> list[dict[str, Any]]:
        # Bei Prefetch: .order_by() auf dem Related-Manager löst oft einen Extra-Query aus.
        cache = getattr(obj, "_prefetched_objects_cache", None)
        if cache and "element_rows" in cache:
            rows = obj.element_rows.all()
        else:
            rows = obj.element_rows.all().order_by("order", "id")
        return [TemplateElementSerializer(r, context=self.context).data for r in rows]


class TemplateSetSerializer(serializers.ModelSerializer):
    templates = TemplateSerializer(many=True, read_only=True)

    class Meta:
        model = TemplateSet
        fields = ("id", "name", "templates", "created_at", "updated_at")
        read_only_fields = ("id", "templates", "created_at", "updated_at")


class TemplateSetCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateSet
        fields = ("id", "name", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ("id", "username", "password", "email")
        extra_kwargs = {"email": {"required": False}}

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserMeSerializer(serializers.ModelSerializer):
    """Aktueller Nutzer: Lesen inkl. E-Mail und Metadaten; Schreiben Benutzername + E-Mail."""

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "date_joined",
            "last_login",
            "is_staff",
            "is_superuser",
        )
        read_only_fields = ("id", "date_joined", "last_login", "is_staff", "is_superuser")

    def validate_username(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Benutzername darf nicht leer sein.")
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user and user.is_authenticated:
            if User.objects.filter(username=value).exclude(pk=user.pk).exists():
                raise serializers.ValidationError("Dieser Benutzername ist bereits vergeben.")
        return value

    def validate_email(self, value: str) -> str:
        raw = "" if value is None else str(value).strip()
        if raw == "":
            return ""
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user and user.is_authenticated:
            if User.objects.filter(email__iexact=raw).exclude(pk=user.pk).exists():
                raise serializers.ValidationError("Diese E-Mail ist bereits vergeben.")
        return raw.lower()


class DeleteAccountSerializer(serializers.Serializer):
    """Kontolöschung: Passwort + exakter Benutzername als Bestätigung."""

    password = serializers.CharField(write_only=True)
    confirm_username = serializers.CharField(write_only=True)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Nicht angemeldet.")
        if not user.check_password(attrs["password"]):
            raise serializers.ValidationError({"password": "Das Passwort ist nicht korrekt."})
        if (attrs.get("confirm_username") or "").strip() != user.username:
            raise serializers.ValidationError(
                {
                    "confirm_username": (
                        "Benutzername stimmt nicht — gib deinen exakten Benutzernamen ein."
                    ),
                },
            )
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Nicht angemeldet.")
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError(
                {"current_password": "Das aktuelle Passwort ist nicht korrekt."},
            )
        return attrs


def replace_template_elements(
    template: Template,
    elements_data: list,
    *,
    regenerate_element_ids: bool = False,
) -> None:
    """Ersetzt alle Elemente transaktional (Bulk-PUT).

    regenerate_element_ids: bei Import/neuer Vorlage aus Kopie immer True, damit keine
    globalen PK-Kollisionen mit bestehenden TemplateElement-Zeilen entstehen.
    """
    if not isinstance(elements_data, list):
        raise serializers.ValidationError("Body muss ein JSON-Array von Elementen sein.")
    TemplateElement.objects.filter(template=template).delete()
    bulk = []
    for idx, raw in enumerate(elements_data):
        if not isinstance(raw, dict):
            raise serializers.ValidationError(f"Ungültiges Element an Index {idx}")
        pk, el_type, payload = TemplateElementSerializer.split_element_dict(
            raw,
            idx,
            regenerate_element_ids=regenerate_element_ids,
        )
        bulk.append(
            TemplateElement(
                id=pk,
                template=template,
                order=idx,
                element_type=el_type,
                payload=payload,
            )
        )
    TemplateElement.objects.bulk_create(bulk)
