from __future__ import annotations

import json
import mimetypes
import uuid
from typing import Any
from urllib.parse import urlparse

import httpx
from django.conf import settings
from django.core.files.base import ContentFile
from django.http import FileResponse, Http404
from django.db import transaction
from django.db.models import Max, Prefetch
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .helpers import apply_frame_fields, read_image_dimensions
from .models import Template, TemplateElement, TemplateSet
from .serializers import (
    ChangePasswordSerializer,
    DeleteAccountSerializer,
    TemplateSerializer,
    TemplateSetCreateUpdateSerializer,
    TemplateSetSerializer,
    UserMeSerializer,
    UserRegistrationSerializer,
    replace_template_elements,
)


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = (AllowAny,)
    throttle_scope = "register"

    def post(self, request):
        ser = UserRegistrationSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserMeSerializer(request.user).data)

    def patch(self, request):
        ser = UserMeSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(UserMeSerializer(request.user).data)


@method_decorator(csrf_protect, name="dispatch")
class ChangePasswordView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        request.user.set_password(ser.validated_data["new_password"])
        request.user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class AccountDataExportView(APIView):
    """GET — DSGVO-nahe Zusammenstellung eigener Stammdaten & Vorlagen-Metadaten (ohne Bilddateien)."""

    permission_classes = (IsAuthenticated,)

    def get(self, request):
        user = request.user
        sets = (
            TemplateSet.objects.filter(user=user)
            .prefetch_related(
                Prefetch(
                    "templates",
                    queryset=Template.objects.order_by("order", "created_at"),
                ),
            )
            .order_by("name", "id")
        )
        payload = {
            "export_version": 1,
            "exported_at": timezone.now().isoformat(),
            "user": {
                "username": user.username,
                "email": user.email or "",
                "date_joined": user.date_joined.isoformat() if user.date_joined else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
            },
            "template_sets": [
                {
                    "id": str(ts.id),
                    "name": ts.name,
                    "created_at": ts.created_at.isoformat(),
                    "updated_at": ts.updated_at.isoformat(),
                    "templates": [
                        {
                            "id": str(t.id),
                            "name": t.name,
                            "width": t.width,
                            "height": t.height,
                            "order": t.order,
                        }
                        for t in ts.templates.all()
                    ],
                }
                for ts in sets
            ],
        }
        return Response(payload)


@method_decorator(csrf_protect, name="dispatch")
class DeleteAccountView(APIView):
    """POST — Konto und abhängige Daten endgültig löschen (CASCADE)."""

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        ser = DeleteAccountSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _same_host_url(request, url: str) -> bool:
    try:
        p = urlparse(url)
        if p.scheme in ("", "http", "https") and p.netloc == "":
            return True
        host = request.get_host()
        return p.netloc.lower() == host.lower()
    except Exception:
        return False


def _trusted_r2_template_bg_netlocs() -> set[str]:
    """Hosts, unter denen dauerhafte Vorlagen-Hintergründe öffentlich liegen (SSRF-Allowlist)."""
    out: set[str] = set()
    dom = (getattr(settings, "AWS_S3_CUSTOM_DOMAIN", "") or "").strip()
    if dom:
        d = dom.lower().rstrip("/")
        if "://" in d:
            net = urlparse(d).netloc.lower()
            if net:
                out.add(net)
        else:
            out.add(d.split("/")[0].lower())
    ep = (getattr(settings, "AWS_S3_ENDPOINT_URL", "") or "").strip()
    if ep:
        net = urlparse(ep).netloc.lower()
        if net:
            out.add(net)
    return out


def _durable_template_bg_url_path(url: str) -> bool:
    """Nur dauerhafte Vorlagen-Hintergründe (neu: ce/core/…, legacy: template_backgrounds/)."""
    try:
        p = urlparse(url)
        path = (p.path or "").replace("\\", "/").lower()
        if not path.startswith("/"):
            path = "/" + path
        return path.startswith("/ce/core/template_backgrounds/") or path.startswith(
            "/template_backgrounds/"
        )
    except Exception:
        return False


def _import_bg_url_allowed(request, url: str) -> bool:
    """Gleiche Origin wie API oder öffentliche R2-URL unter Vorlagen-Hintergründen (ce/core/…)."""
    if _same_host_url(request, url):
        return True
    try:
        p = urlparse(url)
        if p.scheme not in ("http", "https"):
            return False
        if not _durable_template_bg_url_path(url):
            return False
        return p.netloc.lower() in _trusted_r2_template_bg_netlocs()
    except Exception:
        return False


class TemplateSetViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get_queryset(self):
        """Sortierte Prefetches — vermeidet N+1 und erneute Queries durch order_by auf Prefetch."""
        ordered_elements = TemplateElement.objects.order_by("order", "id")
        ordered_templates = Template.objects.order_by("order", "created_at").prefetch_related(
            Prefetch("element_rows", queryset=ordered_elements),
        )
        return TemplateSet.objects.filter(user=self.request.user).prefetch_related(
            Prefetch("templates", queryset=ordered_templates),
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
            width, height = read_image_dimensions(upload)
        except Exception:
            return Response(
                {"detail": "Bild konnte nicht gelesen werden."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        upload.seek(0)
        max_order = template_set.templates.aggregate(m=Max("order"))["m"] or 0
        tpl = Template(
            template_set=template_set,
            name=name,
            width=width,
            height=height,
            background_image=upload,
            order=max_order + 1,
        )
        apply_frame_fields(tpl, {}, set_defaults=True)
        tpl.save()
        if elements_raw:
            replace_template_elements(tpl, elements_raw, regenerate_element_ids=True)
        tpl.refresh_from_db()
        out = TemplateSerializer(tpl, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="export")
    def export_set(self, request, pk=None):
        obj = self.get_object()
        return Response(
            TemplateSetSerializer(
                obj,
                context={"request": request, "export_background_urls": True},
            ).data
        )

    @action(detail=False, methods=["post"], url_path="import")
    @transaction.atomic
    def import_set(self, request):
        """
        POST …/import/ — exportiertes Set-JSON.
        Lädt Hintergrundbilder nur von derselben Origin wie die API oder von R2
        (AWS_S3_CUSTOM_DOMAIN / Endpoint), ausschließlich unter
        ``ce/core/template_backgrounds/`` bzw. Legacy ``template_backgrounds/`` (SSRF).
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
            if not _import_bg_url_allowed(request, abs_url):
                return Response(
                    {
                        "detail": "bgImage muss unter derselben Origin wie die API erreichbar sein "
                        "oder eine erlaubte R2-URL unter ce/core/template_backgrounds/ "
                        "(oder legacy template_backgrounds/) sein."
                    },
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
                width, height = read_image_dimensions(r.content)
            except Exception:
                return Response(
                    {"detail": "Import-Bild ist kein gültiges Bild."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            tpl_name = str(t_raw.get("name") or f"Vorlage {idx + 1}")[:255]
            cf = ContentFile(r.content, name=f"import_{uuid.uuid4().hex[:10]}.{ext}")
            tpl = Template(
                template_set=new_set,
                name=tpl_name,
                width=width,
                height=height,
                background_image=cf,
                order=idx,
            )
            apply_frame_fields(tpl, t_raw, allow_legacy=True, set_defaults=True)
            tpl.save()
            els = t_raw.get("elements")
            if isinstance(els, list) and els:
                replace_template_elements(tpl, els, regenerate_element_ids=True)
        ser = TemplateSetSerializer(new_set, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)


class TemplateViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    http_method_names = ["get", "patch", "put", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self):
        return (
            Template.objects.filter(template_set__user=self.request.user)
            .select_related("template_set")
            .prefetch_related(
                Prefetch(
                    "element_rows",
                    queryset=TemplateElement.objects.order_by("order", "id"),
                ),
            )
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
            apply_frame_fields(tpl, data, allow_legacy=True)
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

    @action(
        detail=True,
        methods=["get"],
        url_path="background",
        url_name="background",
    )
    def serve_background(self, request, pk=None):
        """Liefert das Hintergrundbild same-origin (JWT-Cookie), damit Canvas CORS nicht braucht."""
        tpl = self.get_object()
        if not tpl.background_image:
            raise Http404()
        fh = tpl.background_image.open("rb")
        name = getattr(tpl.background_image, "name", "") or ""
        content_type, _ = mimetypes.guess_type(name)
        if not content_type:
            content_type = "application/octet-stream"
        resp = FileResponse(fh, content_type=content_type)
        resp["Cache-Control"] = "private, max-age=3600"
        return resp
