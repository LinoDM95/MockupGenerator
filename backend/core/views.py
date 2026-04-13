from __future__ import annotations

import io
import json
import uuid
from typing import Any
from urllib.parse import urlparse

import httpx
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Max
from PIL import Image
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Template, TemplateSet
from .serializers import (
    TemplateSerializer,
    TemplateSetCreateUpdateSerializer,
    TemplateSetSerializer,
    UserRegistrationSerializer,
    replace_template_elements,
)


class LoginView(TokenObtainPairView):
    permission_classes = (AllowAny,)


class RegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        ser = UserRegistrationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(status=status.HTTP_201_CREATED)


def _parse_boolish(v) -> bool | None:
    if v is None:
        return None
    if v is True:
        return True
    if v is False:
        return False
    s = str(v).lower()
    if s in ("1", "true", "yes"):
        return True
    if s in ("0", "false", "no", ""):
        return False
    return None


def _clamp_sides_mask(v) -> int | None:
    try:
        i = int(v)
        return max(0, min(15, i))
    except (TypeError, ValueError):
        return None


def _same_host_url(request, url: str) -> bool:
    try:
        p = urlparse(url)
        if p.scheme in ("", "http", "https") and p.netloc == "":
            return True
        host = request.get_host()
        return p.netloc.lower() == host.lower()
    except Exception:
        return False


class TemplateSetViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get_queryset(self):
        return TemplateSet.objects.filter(user=self.request.user).prefetch_related(
            "templates__element_rows",
        )

    def get_serializer_class(self):
        if self.action in ("create", "partial_update", "update"):
            return TemplateSetCreateUpdateSerializer
        return TemplateSetSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="templates")
    @transaction.atomic
    def add_template(self, request, pk=None):
        """POST …/templates/ — multipart: background_image, optional name, elements (JSON string)."""
        template_set = self.get_object()
        upload = request.FILES.get("background_image")
        if not upload:
            return Response(
                {"detail": "background_image erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = (request.data.get("name") or upload.name or "Vorlage").strip()
        name = str(name)[:255]
        elements_raw: list[Any] = []
        raw_el = request.data.get("elements")
        if raw_el:
            if isinstance(raw_el, str):
                try:
                    elements_raw = json.loads(raw_el)
                except json.JSONDecodeError:
                    return Response(
                        {"detail": "Ungültiges JSON in elements."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            elif isinstance(raw_el, list):
                elements_raw = raw_el
        try:
            with Image.open(upload) as im:
                width, height = im.size
        except Exception:
            return Response(
                {"detail": "Bild konnte nicht gelesen werden."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload.seek(0)
        max_order = template_set.templates.aggregate(m=Max("order"))["m"] or 0
        tpl = Template.objects.create(
            template_set=template_set,
            name=name,
            width=width,
            height=height,
            background_image=upload,
            order=max_order + 1,
            default_frame_style="none",
            frame_shadow_outer_enabled=False,
            frame_shadow_inner_enabled=False,
            frame_outer_sides=15,
            frame_inner_sides=15,
            frame_shadow_depth=0.82,
            artwork_saturation=1.0,
        )
        if elements_raw:
            replace_template_elements(tpl, elements_raw, regenerate_element_ids=True)
        tpl.refresh_from_db()
        out = TemplateSerializer(tpl, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="export")
    def export_set(self, request, pk=None):
        obj = self.get_object()
        return Response(TemplateSetSerializer(obj, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="import")
    @transaction.atomic
    def import_set(self, request):
        """
        POST …/import/ — exportiertes Set-JSON.
        Lädt Hintergrundbilder nur von derselben Host-Angabe wie der Request (mitigiert SSRF).
        """
        body = request.data
        if not isinstance(body, dict):
            return Response({"detail": "JSON-Objekt erwartet."}, status=status.HTTP_400_BAD_REQUEST)
        name = str(body.get("name") or "Import").strip()[:255]
        templates_data = body.get("templates")
        if not isinstance(templates_data, list):
            return Response(
                {"detail": "templates muss eine Liste sein."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_set = TemplateSet.objects.create(user=request.user, name=name)
        for idx, t_raw in enumerate(templates_data):
            if not isinstance(t_raw, dict):
                continue
            bg = t_raw.get("bgImage")
            if not bg:
                continue
            abs_url = request.build_absolute_uri(bg) if str(bg).startswith("/") else str(bg)
            if not _same_host_url(request, abs_url):
                return Response(
                    {"detail": "bgImage muss dieselbe Origin wie die API haben."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                r = httpx.get(abs_url, timeout=60.0, follow_redirects=True)
                r.raise_for_status()
            except httpx.HTTPError:
                return Response(
                    {"detail": f"Hintergrund konnte nicht geladen werden: {abs_url[:120]}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            ext = "png"
            path = urlparse(abs_url).path.lower()
            if path.endswith((".jpg", ".jpeg")):
                ext = "jpg"
            elif path.endswith(".webp"):
                ext = "webp"
            try:
                with Image.open(io.BytesIO(r.content)) as im:
                    width, height = im.size
            except Exception:
                return Response(
                    {"detail": "Import-Bild ist kein gültiges Bild."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            tpl_name = str(t_raw.get("name") or f"Vorlage {idx + 1}")[:255]
            cf = ContentFile(r.content, name=f"import_{uuid.uuid4().hex[:10]}.{ext}")
            dfs = t_raw.get("default_frame_style") or t_raw.get("defaultFrameStyle") or "none"
            if str(dfs) not in ("none", "black", "white", "wood"):
                dfs = "none"
            outer_b = _parse_boolish(
                t_raw.get("frame_shadow_outer_enabled", t_raw.get("frameShadowOuterEnabled"))
            )
            inner_b = _parse_boolish(
                t_raw.get("frame_shadow_inner_enabled", t_raw.get("frameShadowInnerEnabled"))
            )
            outer_on = False if outer_b is None else outer_b
            inner_on = False if inner_b is None else inner_b
            if not outer_on and not inner_on:
                raw_dir = t_raw.get("frame_shadow_direction", t_raw.get("frameShadowDirection"))
                d = str(raw_dir or "").lower()
                if d in ("outward", "out", "external"):
                    outer_on = True
                elif d in ("inward", "in", "internal"):
                    inner_on = True
                else:
                    raw_fshadow = t_raw.get("frame_drop_shadow", t_raw.get("frameDropShadow"))
                    if raw_fshadow is not None and (
                        raw_fshadow is True or str(raw_fshadow).lower() in ("1", "true", "yes")
                    ):
                        outer_on = True
            outer_sides = _clamp_sides_mask(
                t_raw.get("frame_outer_sides", t_raw.get("frameOuterSides")),
            )
            inner_sides = _clamp_sides_mask(
                t_raw.get("frame_inner_sides", t_raw.get("frameInnerSides")),
            )
            frame_shadow_outer_enabled = outer_on
            frame_shadow_inner_enabled = inner_on
            frame_outer_sides = outer_sides if outer_sides is not None else 15
            frame_inner_sides = inner_sides if inner_sides is not None else 15
            raw_depth = t_raw.get("frame_shadow_depth", t_raw.get("frameShadowDepth"))
            if raw_depth is None:
                frame_shadow_depth = 0.82
            else:
                try:
                    frame_shadow_depth = float(raw_depth)
                except (TypeError, ValueError):
                    frame_shadow_depth = 0.82
                frame_shadow_depth = max(0.15, min(1.0, frame_shadow_depth))
            raw_sat = t_raw.get("artwork_saturation", t_raw.get("artworkSaturation"))
            if raw_sat is None:
                artwork_saturation = 1.0
            else:
                try:
                    artwork_saturation = float(raw_sat)
                except (TypeError, ValueError):
                    artwork_saturation = 1.0
                artwork_saturation = max(0.15, min(1.0, artwork_saturation))
            tpl = Template.objects.create(
                template_set=new_set,
                name=tpl_name,
                width=width,
                height=height,
                background_image=cf,
                order=idx,
                default_frame_style=str(dfs),
                frame_shadow_outer_enabled=frame_shadow_outer_enabled,
                frame_shadow_inner_enabled=frame_shadow_inner_enabled,
                frame_outer_sides=frame_outer_sides,
                frame_inner_sides=frame_inner_sides,
                frame_shadow_depth=frame_shadow_depth,
                artwork_saturation=artwork_saturation,
            )
            els = t_raw.get("elements")
            if isinstance(els, list) and els:
                replace_template_elements(tpl, els, regenerate_element_ids=True)
        ser = TemplateSetSerializer(new_set, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)


class TemplateViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    http_method_names = ["get", "patch", "put", "delete", "head", "options"]

    def get_queryset(self):
        return Template.objects.filter(template_set__user=self.request.user).select_related(
            "template_set",
        )

    def get_serializer_class(self):
        return TemplateSerializer

    def partial_update(self, request, *args, **kwargs):
        tpl = self.get_object()
        if request.content_type and "multipart/form-data" in request.content_type:
            if "name" in request.data and request.data["name"] not in (None, ""):
                tpl.name = str(request.data["name"])[:255]
            for field in ("width", "height", "order"):
                if field in request.data and request.data[field] not in (None, ""):
                    setattr(tpl, field, int(request.data[field]))
            img = request.FILES.get("background_image")
            if img:
                tpl.background_image = img
            tpl.save()
        else:
            data = request.data
            if "name" in data:
                tpl.name = str(data["name"])[:255]
            if "width" in data:
                tpl.width = int(data["width"])
            if "height" in data:
                tpl.height = int(data["height"])
            if "order" in data:
                tpl.order = int(data["order"])
            raw_dfs = data.get("default_frame_style", data.get("defaultFrameStyle"))
            if raw_dfs is not None:
                v = str(raw_dfs)
                if v in ("none", "black", "white", "wood"):
                    tpl.default_frame_style = v
            had_new_outer = any(
                k in data for k in ("frame_shadow_outer_enabled", "frameShadowOuterEnabled")
            )
            had_new_inner = any(
                k in data for k in ("frame_shadow_inner_enabled", "frameShadowInnerEnabled")
            )
            raw_o = _parse_boolish(
                data.get("frame_shadow_outer_enabled", data.get("frameShadowOuterEnabled"))
            )
            if raw_o is not None:
                tpl.frame_shadow_outer_enabled = raw_o
            raw_i = _parse_boolish(
                data.get("frame_shadow_inner_enabled", data.get("frameShadowInnerEnabled"))
            )
            if raw_i is not None:
                tpl.frame_shadow_inner_enabled = raw_i
            raw_os = _clamp_sides_mask(data.get("frame_outer_sides", data.get("frameOuterSides")))
            if raw_os is not None:
                tpl.frame_outer_sides = raw_os
            raw_is = _clamp_sides_mask(data.get("frame_inner_sides", data.get("frameInnerSides")))
            if raw_is is not None:
                tpl.frame_inner_sides = raw_is
            raw_dir = data.get("frame_shadow_direction", data.get("frameShadowDirection"))
            raw_legacy = data.get("frame_drop_shadow", data.get("frameDropShadow"))
            if (
                not had_new_outer
                and not had_new_inner
                and (raw_dir is not None or raw_legacy is not None)
            ):
                d = str(raw_dir or "none").lower()
                if d in ("outward", "out", "external"):
                    tpl.frame_shadow_outer_enabled = True
                    tpl.frame_shadow_inner_enabled = False
                elif d in ("inward", "in", "internal"):
                    tpl.frame_shadow_outer_enabled = False
                    tpl.frame_shadow_inner_enabled = True
                elif raw_legacy is not None and raw_dir is None:
                    tpl.frame_shadow_outer_enabled = raw_legacy is True or str(raw_legacy).lower() in (
                        "1",
                        "true",
                        "yes",
                    )
                    tpl.frame_shadow_inner_enabled = False
                elif d == "none":
                    tpl.frame_shadow_outer_enabled = False
                    tpl.frame_shadow_inner_enabled = False
            raw_depth = data.get("frame_shadow_depth", data.get("frameShadowDepth"))
            if raw_depth is not None:
                try:
                    v = float(raw_depth)
                    tpl.frame_shadow_depth = max(0.15, min(1.0, v))
                except (TypeError, ValueError):
                    pass
            raw_sat = data.get("artwork_saturation", data.get("artworkSaturation"))
            if raw_sat is not None:
                try:
                    v = float(raw_sat)
                    tpl.artwork_saturation = max(0.15, min(1.0, v))
                except (TypeError, ValueError):
                    pass
            tpl.save()
        tpl.refresh_from_db()
        return Response(TemplateSerializer(tpl, context={"request": request}).data)

    @action(detail=True, methods=["put"], url_path="elements")
    @transaction.atomic
    def replace_elements(self, request, pk=None):
        tpl = self.get_object()
        replace_template_elements(tpl, request.data, regenerate_element_ids=False)
        tpl.refresh_from_db()
        return Response(TemplateSerializer(tpl, context={"request": request}).data)
