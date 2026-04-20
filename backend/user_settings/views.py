from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.cache import cache
from marketing_integration.models import SocialPlatform
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    IntegrationSaveSerializer,
    IntegrationTestSerializer,
    IntegrationsStatusSerializer,
    upsert_user_integration,
)
from .services import (
    pinterest_effective_connected_from_row,
    sync_gemini_to_ai_connection,
    sync_gelato_to_connection,
    test_cloudflare_r2,
    test_gemini_api_key,
    test_gelato_api_key,
    test_pinterest_connection,
)


def _etsy_connected(user: AbstractUser) -> bool:
    c = getattr(user, "etsy_connection", None)
    return bool(c and c.access_token_enc)


def _vertex_connected(user: AbstractUser) -> bool:
    ai = getattr(user, "ai_connection", None)
    if not ai:
        return False
    return bool(ai.service_account_json_enc and ai.is_active)


def _gemini_connected(user: AbstractUser) -> bool:
    ai = getattr(user, "ai_connection", None)
    if ai and ai.api_key_enc:
        return True
    ui = getattr(user, "user_integration", None)
    return bool(ui and ui.gemini_api_key_enc)


def _gelato_connected(user: AbstractUser) -> bool:
    g = getattr(user, "gelato_connection", None)
    if g and g.api_key_enc:
        return True
    ui = getattr(user, "user_integration", None)
    return bool(ui and ui.gelato_api_key_enc)


def _r2_connected(user: AbstractUser) -> bool:
    ui = getattr(user, "user_integration", None)
    if not ui:
        return False
    return bool(
        ui.cloudflare_endpoint.strip()
        and ui.cloudflare_bucket_name.strip()
        and ui.cloudflare_access_key_enc
        and ui.cloudflare_secret_key_enc
    )


def _resolve_gemini_key(user: AbstractUser) -> str:
    ai = getattr(user, "ai_connection", None)
    if ai and ai.api_key_enc:
        return ai.get_api_key()
    ui = getattr(user, "user_integration", None)
    if ui and ui.gemini_api_key_enc:
        return ui.get_gemini_key()
    return ""


def _resolve_gelato_key(user: AbstractUser) -> str:
    g = getattr(user, "gelato_connection", None)
    if g and g.api_key_enc:
        return g.get_api_key()
    ui = getattr(user, "user_integration", None)
    if ui and ui.gelato_api_key_enc:
        return ui.get_gelato_key()
    return ""


def _integrations_status_cache_key(user_id: int) -> str:
    return f"integrations_status:v1:{user_id}"


def invalidate_integrations_status_cache(user_id: int) -> None:
    cache.delete(_integrations_status_cache_key(user_id))


class IntegrationsStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cache_key = _integrations_status_cache_key(request.user.pk)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        user_model = request.user.__class__
        user = user_model.objects.select_related(
            "etsy_connection",
            "ai_connection",
            "gelato_connection",
            "user_integration",
        ).get(pk=request.user.pk)
        pinterest_sp = SocialPlatform.objects.filter(
            user_id=user.pk,
            platform=SocialPlatform.Platform.PINTEREST,
        ).first()
        data = {
            "etsy": _etsy_connected(user),
            "gemini": _gemini_connected(user),
            "gelato": _gelato_connected(user),
            "vertex": _vertex_connected(user),
            "cloudflare_r2": _r2_connected(user),
            "pinterest": pinterest_effective_connected_from_row(pinterest_sp),
        }
        ser = IntegrationsStatusSerializer(data=data)
        ser.is_valid(raise_exception=True)
        payload = dict(ser.validated_data)
        cache.set(
            cache_key,
            payload,
            getattr(settings, "INTEGRATIONS_STATUS_CACHE_SECONDS", 12),
        )
        return Response(payload)


class IntegrationsSaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = IntegrationSaveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        integration = ser.validated_data["integration"]
        payload = ser.validated_data["payload"]
        user = request.user
        ui = upsert_user_integration(user)

        if integration == "gemini":
            key = str(payload["api_key"]).strip()
            ui.set_gemini_key(key)
            ui.save(update_fields=["gemini_api_key_enc", "updated_at"])
            sync_gemini_to_ai_connection(user, key)
            invalidate_integrations_status_cache(user.pk)
            return Response({"ok": True, "integration": integration})

        if integration == "gelato":
            key = str(payload["api_key"]).strip()
            ui.set_gelato_key(key)
            ui.save(update_fields=["gelato_api_key_enc", "updated_at"])
            sync_gelato_to_connection(user, key)
            invalidate_integrations_status_cache(user.pk)
            return Response({"ok": True, "integration": integration})

        # cloudflare_r2
        ui.set_cloudflare_access_key(str(payload["access_key"]).strip())
        ui.set_cloudflare_secret_key(str(payload["secret_key"]).strip())
        ui.cloudflare_endpoint = str(payload["endpoint"]).strip()
        ui.cloudflare_bucket_name = str(payload["bucket_name"]).strip()
        ui.save(
            update_fields=[
                "cloudflare_access_key_enc",
                "cloudflare_secret_key_enc",
                "cloudflare_endpoint",
                "cloudflare_bucket_name",
                "updated_at",
            ]
        )
        invalidate_integrations_status_cache(user.pk)
        return Response({"ok": True, "integration": integration})


class IntegrationsTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = IntegrationTestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        provider = ser.validated_data["provider"]
        user = request.user

        try:
            if provider == "gemini":
                test_gemini_api_key(_resolve_gemini_key(user))
            elif provider == "gelato":
                test_gelato_api_key(_resolve_gelato_key(user))
            elif provider == "cloudflare_r2":
                ui = getattr(user, "user_integration", None)
                if not ui or not _r2_connected(user):
                    return Response(
                        {"detail": "Cloudflare R2 ist nicht vollständig gespeichert. Bitte zuerst speichern."},
                        status=400,
                    )
                test_cloudflare_r2(
                    endpoint_url=ui.cloudflare_endpoint,
                    access_key=ui.get_cloudflare_access_key(),
                    secret_key=ui.get_cloudflare_secret_key(),
                    bucket_name=ui.cloudflare_bucket_name,
                )
            else:
                test_pinterest_connection(user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        return Response({"ok": True, "provider": provider})
