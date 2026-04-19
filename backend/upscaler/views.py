from __future__ import annotations

import logging
import os
from io import BytesIO
from urllib.parse import quote

from PIL import Image as PILImage
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.http import HttpResponse

from ai_integration.models import AIConnection
from upscaler.limits import get_max_output_pixels

from .services import (
    UpscaleAPIError,
    UpscaleError,
    UpscaleUserInputError,
    VertexAPINotEnabledError,
    upscale_image,
)

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB (Imagen limit)
TOTAL_FACTORS = frozenset({2, 4, 8, 16})
MAX_TARGET_SIDE = 16384

_VERTEX_ACTIVATION_URL = (
    "https://console.developers.google.com/apis/api/aiplatform.googleapis.com/overview"
)


def _vertex_activation_url(project_id: str) -> str:
    return f"{_VERTEX_ACTIVATION_URL}?project={quote(project_id, safe='')}"


def _parse_factor_total(raw: str | None) -> int | None:
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if not s:
        return None
    if s.startswith("x"):
        s = s[1:]
    try:
        v = int(s, 10)
    except ValueError:
        return None
    return v if v in TOTAL_FACTORS else None


def _parse_positive_int(raw: str | None) -> int | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    try:
        v = int(s, 10)
    except ValueError:
        return None
    return v if v >= 1 else None


class UpscaleImageView(APIView):
    """POST -- upload an image and receive the AI-upscaled version back."""

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        conn = AIConnection.objects.filter(
            user=request.user, is_active=True
        ).first()
        sa_json = conn.get_service_account_json() if conn else ""
        if not conn or not sa_json.strip():
            return Response(
                {
                    "detail": (
                        "Vertex AI Service Account fehlt. Bitte unter KI-Integration "
                        "im Bereich 'Google Cloud Vertex AI (Upscaler)' die .json-Datei "
                        "hinterlegen."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        image = request.FILES.get("image")
        if not image:
            return Response(
                {"detail": "Das Feld 'image' ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = os.path.splitext(image.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {
                    "detail": (
                        f"Dateityp '{ext}' nicht erlaubt. "
                        f"Erlaubt: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if image.size and image.size > MAX_IMAGE_SIZE:
            mb = MAX_IMAGE_SIZE // (1024 * 1024)
            return Response(
                {"detail": f"Bild zu gross (max {mb} MB)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tw = _parse_positive_int(request.data.get("target_width"))
        th = _parse_positive_int(request.data.get("target_height"))
        factor_total = _parse_factor_total(request.data.get("factor"))

        has_target = tw is not None and th is not None
        has_partial_target = (tw is None) != (th is None)
        has_factor = factor_total is not None

        if has_partial_target:
            return Response(
                {
                    "detail": (
                        "Fuer Zielaufloesung muessen sowohl target_width als auch "
                        "target_height gesetzt sein."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if has_target and has_factor:
            return Response(
                {
                    "detail": (
                        "Bitte entweder Faktor ODER Zielaufloesung angeben, nicht beides."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not has_target and not has_factor:
            return Response(
                {
                    "detail": (
                        "Bitte 'factor' (2, 4, 8 oder 16) oder "
                        "'target_width' und 'target_height' angeben."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if has_factor and factor_total is None:
            return Response(
                {
                    "detail": (
                        "Ungueltiger Faktor. Erlaubt: 2, 4, 8 oder 16 "
                        "(z. B. factor=8 oder factor=x8)."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_px_cap = min(get_max_output_pixels(), 67_108_864)
        if has_target:
            assert tw is not None and th is not None
            if tw > MAX_TARGET_SIDE or th > MAX_TARGET_SIDE:
                return Response(
                    {
                        "detail": (
                            f"Zielabmessungen zu gross (max {MAX_TARGET_SIDE} px pro Kante)."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if tw * th > max_px_cap:
                return Response(
                    {
                        "detail": (
                            "Zielflaeche (Breite x Hoehe) ueberschreitet das erlaubte Maximum. "
                            "Bitte kleinere Werte waehlen oder UPSCALE_MAX_OUTPUT_PIXELS pruefen."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            pil_img = PILImage.open(image)
            pil_img.load()
        except Exception:
            return Response(
                {"detail": "Die Datei konnte nicht als Bild gelesen werden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orig_w, orig_h = pil_img.size

        try:
            if has_target:
                assert tw is not None and th is not None
                result_img = upscale_image(
                    pil_img=pil_img,
                    service_account_json=sa_json,
                    target_width=tw,
                    target_height=th,
                )
            else:
                assert factor_total is not None
                result_img = upscale_image(
                    pil_img=pil_img,
                    service_account_json=sa_json,
                    factor_total=factor_total,
                )
        except VertexAPINotEnabledError as exc:
            logger.warning(
                "Vertex AI API not enabled for project %s",
                exc.project_id,
            )
            return Response(
                {
                    "error_type": "api_not_enabled",
                    "message": "Die Vertex AI API ist nicht aktiviert.",
                    "activation_url": _vertex_activation_url(exc.project_id),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except UpscaleAPIError as exc:
            logger.warning("Upscale API error: %s", exc)
            return Response(
                {"detail": str(exc)},
                status=exc.status_code,
            )
        except UpscaleUserInputError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except UpscaleError as exc:
            logger.error("Upscale error: %s", exc)
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            logger.exception("Unexpected upscale error")
            return Response(
                {"detail": f"Unerwarteter Fehler: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        up_w, up_h = result_img.size
        buf = BytesIO()
        result_img.save(buf, format="PNG", optimize=True)
        buf.seek(0)

        resp = HttpResponse(buf.getvalue(), content_type="image/png")
        resp["X-Original-Width"] = str(orig_w)
        resp["X-Original-Height"] = str(orig_h)
        resp["X-Upscaled-Width"] = str(up_w)
        resp["X-Upscaled-Height"] = str(up_h)
        resp["Content-Disposition"] = f'inline; filename="upscaled_{up_w}x{up_h}.png"'
        resp["Access-Control-Expose-Headers"] = (
            "X-Original-Width, X-Original-Height, X-Upscaled-Width, X-Upscaled-Height"
        )
        return resp
