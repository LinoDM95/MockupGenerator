from __future__ import annotations

import json
import logging
import os
import re

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .base import (
    AIProviderError,
    AIResponseParseError,
    AIServiceUnavailableError,
    VALID_TARGET_TYPES,
)
from .gemini import normalise_listing_dict
from .manager import AIManager, ProviderNotFoundError
from .models import AIConnection
from .serializers import (
    AIConnectSerializer,
    AIConnectionStatusSerializer,
    AIUpdateModelSerializer,
    AIVertexServiceAccountSerializer,
)

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20 MB
MAX_JSON_PAYLOAD = 256 * 1024  # 256 KB

MAX_CONTEXT_LENGTH = 4000
MAX_STYLE_LENGTH = 500
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
_EMAIL = re.compile(r"[\w\.\-]+@[\w\.\-]+\.\w+")
_PHONE = re.compile(r"\+?\d[\d\s\-()]{7,}")


def _sanitize_for_prompt(raw: str, max_len: int) -> str:
    if raw is None:
        return ""
    text = str(raw).strip()
    if len(text) > max_len:
        text = text[:max_len]
    text = _CONTROL_CHARS.sub("", text)
    text = (
        text.replace("</user>", "")
        .replace("<system>", "")
        .replace("</system>", "")
    )
    return text


def _mask_pii(text: str) -> str:
    text = _EMAIL.sub("[EMAIL]", text)
    text = _PHONE.sub("[PHONE]", text)
    return text


def _truthy(val) -> bool:
    if val is None:
        return False
    s = str(val).strip().lower()
    return s in ("1", "true", "yes", "on")


def _validate_uploaded_image(image) -> str | None:
    """Return error detail string or None if valid."""
    ext = os.path.splitext(image.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return (
            f"Dateityp '{ext}' nicht erlaubt. "
            f"Erlaubt: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    if image.size and image.size > MAX_IMAGE_SIZE:
        mb = MAX_IMAGE_SIZE // (1024 * 1024)
        return f"Bild zu gross (max {mb} MB)."
    return None


def _parse_json_payload(raw, field_label: str) -> dict:
    if raw is None or (isinstance(raw, str) and not str(raw).strip()):
        raise ValueError(f"Feld '{field_label}' ist erforderlich.")
    s = raw if isinstance(raw, str) else str(raw)
    if len(s.encode("utf-8")) > MAX_JSON_PAYLOAD:
        raise ValueError(f"Feld '{field_label}' überschreitet die maximale Grösse.")
    try:
        data = json.loads(s)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Ungültiges JSON in '{field_label}'.") from exc
    if not isinstance(data, dict):
        raise ValueError(f"'{field_label}' muss ein JSON-Objekt sein.")
    return data


class AIConnectView(APIView):
    """POST -- save the user's AI provider credentials (encrypted)."""

    def post(self, request):
        ser = AIConnectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        api_key = ser.validated_data["api_key"]
        model_name = ser.validated_data["model_name"]
        provider = ser.validated_data.get("provider", "gemini")

        conn, _ = AIConnection.objects.get_or_create(user=request.user)
        conn.set_api_key(api_key)
        conn.provider = provider
        conn.model_name = model_name
        conn.is_active = True
        conn.save(update_fields=[
            "api_key_enc", "provider", "model_name", "is_active", "updated_at",
        ])

        return Response(AIConnectionStatusSerializer(conn).data)


class AIUpdateModelView(APIView):
    """PATCH -- update model and/or settings without re-entering the API key."""

    def patch(self, request):
        conn = AIConnection.objects.filter(user=request.user, is_active=True).first()
        if not conn or not conn.api_key_enc:
            return Response(
                {"detail": "Keine aktive KI-Verbindung. Bitte zuerst verbinden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = AIUpdateModelSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        update_fields = ["updated_at"]
        if "model_name" in ser.validated_data:
            conn.model_name = ser.validated_data["model_name"]
            update_fields.append("model_name")
        if "use_grounding" in ser.validated_data:
            conn.use_grounding = ser.validated_data["use_grounding"]
            update_fields.append("use_grounding")
        if "prefer_expert_mode" in ser.validated_data:
            conn.prefer_expert_mode = ser.validated_data["prefer_expert_mode"]
            update_fields.append("prefer_expert_mode")

        conn.save(update_fields=update_fields)

        return Response(AIConnectionStatusSerializer(conn).data)


class AIStatusView(APIView):
    """GET -- return the current user's AI connection status."""

    def get(self, request):
        conn = AIConnection.objects.filter(user=request.user).first()
        if not conn:
            return Response(
                {
                    "connected": False,
                    "vertex_upscaler_configured": False,
                    "provider": None,
                    "model_name": None,
                    "use_grounding": False,
                    "prefer_expert_mode": False,
                    "is_active": False,
                    "created_at": None,
                }
            )
        return Response(AIConnectionStatusSerializer(conn).data)


class AIVertexServiceAccountView(APIView):
    """PATCH -- store or remove encrypted Vertex service account JSON (BYOK)."""

    def patch(self, request):
        ser = AIVertexServiceAccountSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        raw = ser.validated_data["service_account_json"]
        conn, _ = AIConnection.objects.get_or_create(user=request.user)
        conn.set_service_account_json(raw)
        conn.is_active = True
        conn.save(update_fields=["service_account_json_enc", "is_active", "updated_at"])

        return Response(AIConnectionStatusSerializer(conn).data)


class AIDisconnectView(APIView):
    """DELETE -- remove the user's AI connection."""

    def delete(self, request):
        AIConnection.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _get_ai_connection(user) -> tuple[AIConnection | None, Response | None]:
    """Return the active AIConnection for *user* or an error Response."""
    conn = AIConnection.objects.filter(user=user, is_active=True).first()
    if not conn or not conn.api_key_enc:
        return None, Response(
            {"detail": "Keine aktive KI-Verbindung. Bitte unter KI-Integration verbinden."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return conn, None


class GenerateListingDataView(APIView):
    """POST -- analyse product image + context text via AI and return
    SEO-optimised Etsy listing data (titles, tags, description).

    Uses the requesting user's stored API key and model configuration.

    Expert mode (``expert_mode=true``): ``step`` 1–3, structured debate response;
    steps 2–3 accept ``scout_payload`` / ``critic_payload`` JSON; image optional
    for steps 2–3. On failure at step 2 or 3, returns normalised scout draft
    as ``listing`` with ``fallback_used`` when ``scout_payload`` is present.
    """

    parser_classes = (MultiPartParser, FormParser)
    throttle_scope = "ai_generate"

    def post(self, request):
        conn, err = _get_ai_connection(request.user)
        if err:
            return err

        raw_context = request.data.get("context", "")
        if not isinstance(raw_context, str):
            raw_context = str(raw_context)
        raw_style = request.data.get("style_reference", "")
        if not isinstance(raw_style, str):
            raw_style = str(raw_style)
        context_text = _mask_pii(_sanitize_for_prompt(raw_context, MAX_CONTEXT_LENGTH))
        style_reference = _mask_pii(_sanitize_for_prompt(raw_style, MAX_STYLE_LENGTH))
        target_type = str(request.data.get("target", "all")).lower().strip()

        if target_type not in VALID_TARGET_TYPES:
            return Response(
                {
                    "detail": (
                        f"Ungültiger target '{target_type}'. "
                        f"Erlaubt: {', '.join(sorted(VALID_TARGET_TYPES))}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        expert_mode = _truthy(request.data.get("expert_mode"))

        if expert_mode and target_type == "social_caption":
            return Response(
                {
                    "detail": (
                        "Expert-Modus ist für target 'social_caption' nicht verfügbar."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        image = request.FILES.get("image")
        if not expert_mode:
            if not image:
                return Response(
                    {"detail": "Das Feld 'image' (Produktbild) ist erforderlich."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            img_err = _validate_uploaded_image(image)
            if img_err:
                return Response({"detail": img_err}, status=status.HTTP_400_BAD_REQUEST)
        else:
            step_raw = request.data.get("step", "1")
            try:
                step = int(step_raw)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Feld 'step' muss 1, 2 oder 3 sein."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if step not in (1, 2, 3):
                return Response(
                    {"detail": "Feld 'step' muss 1, 2 oder 3 sein."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if step == 1 and not image:
                return Response(
                    {"detail": "Expert-Schritt 1 erfordert 'image'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if image:
                img_err = _validate_uploaded_image(image)
                if img_err:
                    return Response({"detail": img_err}, status=status.HTTP_400_BAD_REQUEST)

        try:
            manager = AIManager(
                provider_name=conn.provider,
                api_key=conn.get_api_key(),
                model_name=conn.model_name,
            )
        except ProviderNotFoundError as exc:
            logger.error("AI provider not found: %s", exc)
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except AIProviderError as exc:
            logger.error("AI provider init error: %s", exc)
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not expert_mode:
            return self._generate_simple(
                manager, image, context_text, target_type, style_reference, conn.use_grounding
            )

        return self._generate_expert(
            request, manager, image, context_text, target_type, style_reference, conn.use_grounding
        )

    def _generate_simple(self, manager, image, context_text, target_type, style_reference, use_grounding):
        try:
            result = manager.generate(
                image_file=image,
                context_text=context_text,
                target_type=target_type,
                style_reference=style_reference,
                use_grounding=use_grounding,
            )
        except AIServiceUnavailableError as exc:
            logger.warning("AI service unavailable: %s", exc)
            return Response(
                {"detail": str(exc), "error_type": "unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except AIResponseParseError as exc:
            logger.warning("AI response parse error: %s", exc)
            return Response(
                {"detail": str(exc), "error_type": "parse_error"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except AIProviderError as exc:
            logger.error("AI generation failed: %s", exc)
            return Response(
                {"detail": str(exc), "error_type": "provider_error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            logger.exception("Unexpected AI generation error")
            return Response(
                {
                    "detail": "Unerwarteter Fehler bei der KI-Generierung.",
                    "error_type": "unexpected",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(result)

    def _expert_fallback_response(self, step: int, scout_data: dict, warning: str) -> Response:
        listing = normalise_listing_dict(scout_data)
        return Response(
            {
                "step": step,
                "thought": "",
                "data": {},
                "listing": listing,
                "fallback_used": True,
                "warning": warning,
            },
            status=status.HTTP_200_OK,
        )

    def _generate_expert(
        self,
        request,
        manager,
        image,
        context_text,
        target_type,
        style_reference,
        use_grounding,
    ):
        step = int(request.data.get("step", "1"))
        scout_data: dict | None = None
        critic_data: dict | None = None

        if step >= 2:
            try:
                scout_data = _parse_json_payload(
                    request.data.get("scout_payload"), "scout_payload"
                )
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if step >= 3:
            try:
                critic_data = _parse_json_payload(
                    request.data.get("critic_payload"), "critic_payload"
                )
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        def run_step():
            return manager.expert_listing_step(
                step=step,
                image_file=image if step == 1 else None,
                context_text=context_text,
                target_type=target_type,
                style_reference=style_reference,
                use_grounding=use_grounding,
                scout_data=scout_data,
                critic_data=critic_data,
            )

        try:
            result = run_step()
        except AIServiceUnavailableError as exc:
            logger.warning("AI expert step unavailable: %s", exc)
            if step in (2, 3) and scout_data is not None:
                return self._expert_fallback_response(step, scout_data, str(exc))
            return Response(
                {"detail": str(exc), "error_type": "unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except AIResponseParseError as exc:
            logger.warning("AI expert parse error: %s", exc)
            if step in (2, 3) and scout_data is not None:
                return self._expert_fallback_response(step, scout_data, str(exc))
            return Response(
                {"detail": str(exc), "error_type": "parse_error"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except AIProviderError as exc:
            logger.error("AI expert step failed: %s", exc)
            if step in (2, 3) and scout_data is not None:
                return self._expert_fallback_response(step, scout_data, str(exc))
            return Response(
                {"detail": str(exc), "error_type": "provider_error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception:
            logger.exception("Unexpected AI expert error")
            if step in (2, 3) and scout_data is not None:
                return self._expert_fallback_response(
                    step, scout_data, "Unerwarteter Fehler bei der KI-Generierung."
                )
            return Response(
                {
                    "detail": "Unerwarteter Fehler bei der KI-Generierung.",
                    "error_type": "unexpected",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if step == 1:
            return Response(
                {
                    "step": 1,
                    "thought": result["thought"],
                    "data": result["data"],
                    "listing": None,
                    "fallback_used": False,
                }
            )
        if step == 2:
            return Response(
                {
                    "step": 2,
                    "thought": result["thought"],
                    "data": result["data"],
                    "listing": None,
                    "fallback_used": False,
                }
            )
        listing = result.get("listing")
        return Response(
            {
                "step": 3,
                "thought": result["thought"],
                "data": result["data"],
                "listing": listing,
                "fallback_used": False,
            }
        )
