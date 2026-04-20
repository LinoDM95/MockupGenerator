from __future__ import annotations

import io
import logging
import os
import uuid as _uuid

from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils import timezone
from PIL import Image as PILImage
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import GelatoConnection, GelatoExportTask, GelatoTemplate, TemporaryDesignUpload
from .serializers import (
    ConnectSerializer,
    GelatoConnectionSerializer,
    GelatoExportTaskSerializer,
    GelatoTemplateSerializer,
    MAX_BULK_DESIGNS,
    SelectStoreSerializer,
    TemplateSyncSerializer,
    TemporaryDesignUploadSerializer,
)
from .r2_cleanup import cleanup_expired_r2_temp_uploads
from .services import GelatoApiError, GelatoClient
from .tasks import process_gelato_bulk_export

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 200 * 1024 * 1024
OPTIMIZE_THRESHOLD = 80 * 1024 * 1024


# ── Image optimization helpers ──────────────────────────────────────


def _swap_ext(filename: str, new_ext: str) -> str:
    root, _ = os.path.splitext(filename)
    return f"{root}{new_ext}"


def _has_real_transparency(img: PILImage.Image) -> bool:
    """Return True only if the image actually uses semi-/fully transparent pixels."""
    if img.mode == "RGBA":
        alpha = img.getchannel("A")
        return alpha.getextrema()[0] < 255
    return False


def _optimize_image(file) -> tuple[io.BytesIO | None, str]:
    """Compress an oversized image while preserving original pixel dimensions and DPI.

    - PNG without real transparency -> JPEG quality=95 (typically 5-10x smaller)
    - PNG with transparency -> PNG optimize=True (~10-20% savings)
    - JPEG > threshold -> re-save at quality=92

    Returns ``(buffer, new_filename)`` or ``(None, "")`` when no work was needed.
    """
    size = getattr(file, "size", None) or 0
    if size < OPTIMIZE_THRESHOLD:
        return None, ""

    original_name: str = getattr(file, "name", "image.png")
    file.seek(0)
    img = PILImage.open(file)
    dpi = img.info.get("dpi", (300, 300))

    has_alpha = img.mode in ("RGBA", "LA", "PA") and _has_real_transparency(img)

    buf = io.BytesIO()
    if has_alpha:
        img.save(buf, format="PNG", optimize=True, dpi=dpi)
        new_name = original_name
        fmt = "PNG"
    else:
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=95, optimize=True, dpi=dpi)
        new_name = _swap_ext(original_name, ".jpg")
        fmt = "JPEG"

    buf.seek(0)
    new_size = buf.getbuffer().nbytes
    logger.debug(
        "_optimize_image %r %.1f MB → %.1f MB (fmt=%s alpha=%s dpi=%s)",
        original_name,
        size / 1024 / 1024,
        new_size / 1024 / 1024,
        fmt,
        has_alpha,
        dpi,
    )
    return buf, new_name


# ── R2 upload ───────────────────────────────────────────────────────


def _upload_to_r2(file, prefix: str, user) -> str:
    """Upload *file* to Cloudflare R2 and return its public URL.

    Key layout: ``{prefix}/users/<user_pk>/…`` — mandantenfähig auf R2.

    Large images are automatically optimised (PNG->JPEG, etc.) before upload.
    Also creates a ``TemporaryDesignUpload`` record so Middleware/Upload-Hook
    die Datei nach konfigurierbarer Aufbewahrungszeit entfernen kann.

    Before uploading, expired files are purged from R2 (cooldown-guarded).
    """
    cleanup_expired_r2_temp_uploads()

    from django.core.files.storage import storages

    size = getattr(file, "size", None)
    name = getattr(file, "name", "?")
    logger.debug("_upload_to_r2 START prefix=%r name=%r size_bytes=%s", prefix, name, size)

    optimized_buf, new_name = _optimize_image(file)
    if optimized_buf is not None:
        content_type = "image/jpeg" if new_name.lower().endswith((".jpg", ".jpeg")) else "image/png"
        file = InMemoryUploadedFile(
            optimized_buf, "image", new_name, content_type,
            optimized_buf.getbuffer().nbytes, None,
        )
        logger.debug(
            "_upload_to_r2 using optimized file name=%r size=%s",
            new_name,
            optimized_buf.getbuffer().nbytes,
        )
    else:
        file.seek(0)

    r2 = storages["r2"]
    unique = _uuid.uuid4().hex[:12]
    base_name = os.path.basename(getattr(file, "name", "") or "upload")
    base_name = base_name.replace(" ", "_") or "upload.jpg"
    base_name = base_name[:180]
    dest = f"{prefix}/users/{user.pk}/{unique}_{base_name}"
    saved_name = r2.save(dest, file)

    domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", "")
    public_url = f"https://{domain}/{saved_name}" if domain else r2.url(saved_name)

    TemporaryDesignUpload.objects.create(user=user, image=saved_name)

    logger.debug(
        "_upload_to_r2 DONE saved_name=%r public_url=%r…",
        saved_name,
        public_url[:120],
    )
    return public_url


def _get_connection_or_error(user) -> tuple[GelatoConnection | None, Response | None]:
    conn = GelatoConnection.objects.filter(user=user, is_active=True).first()
    if not conn:
        return None, Response(
            {"detail": "Keine aktive Gelato-Verbindung."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return conn, None


class GelatoConnectView(APIView):
    """POST – verify API key against Gelato, return available stores.

    Step 1 of the two-step connect flow.  Saves the key immediately so
    the user does not have to paste it again.
    """

    def post(self, request):
        ser = ConnectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        api_key = ser.validated_data["api_key"]

        client = GelatoClient(api_key)
        try:
            stores = client.verify_key()
        except GelatoApiError as e:
            return Response(
                {"detail": f"Gelato-Verbindung fehlgeschlagen: {e.detail}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception("Gelato connect error")
            return Response(
                {"detail": f"Verbindungsfehler: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        finally:
            client.close()

        conn, _ = GelatoConnection.objects.get_or_create(user=request.user)
        conn.set_api_key(api_key)
        conn.is_active = True
        conn.save(update_fields=["api_key_enc", "is_active", "updated_at"])

        normalized: list[dict] = []
        for s in stores:
            normalized.append({
                "id": str(s.get("id", s.get("storeId", ""))),
                "name": s.get("name", s.get("storeName", "")),
            })

        return Response({"stores": normalized})


class GelatoSelectStoreView(APIView):
    """POST – persist the chosen store from the list returned by connect.

    Step 2 of the two-step connect flow.
    """

    def post(self, request):
        ser = SelectStoreSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        store_id = ser.validated_data["store_id"]
        store_name = ser.validated_data.get("store_name", "")

        conn = GelatoConnection.objects.filter(user=request.user).first()
        if not conn or not conn.api_key_enc:
            return Response(
                {"detail": "Bitte zuerst den API-Key verbinden."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conn.store_id = store_id
        conn.store_name = store_name or f"Store {store_id[:8]}"
        conn.is_active = True
        conn.save(update_fields=["store_id", "store_name", "is_active", "updated_at"])

        return Response(GelatoConnectionSerializer(conn).data)


class GelatoDisconnectView(APIView):
    """DELETE – remove Gelato connection for current user."""

    def delete(self, request):
        GelatoConnection.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GelatoStatusView(APIView):
    """GET – return connection status."""

    def get(self, request):
        conn = GelatoConnection.objects.filter(user=request.user).first()
        if not conn:
            return Response({"connected": False})
        return Response(GelatoConnectionSerializer(conn).data)


class GelatoTemplateListView(APIView):
    """GET – return locally synced templates for the user's connection."""

    def get(self, request):
        conn = GelatoConnection.objects.filter(user=request.user, is_active=True).first()
        if not conn:
            return Response([])
        templates = GelatoTemplate.objects.filter(connection=conn, is_active=True).order_by(
            "name",
            "id",
        )
        return Response(GelatoTemplateSerializer(templates, many=True).data)


class GelatoTemplateSyncView(APIView):
    """POST – fetch template details from Gelato by IDs and upsert into DB."""

    def post(self, request):
        conn, err = _get_connection_or_error(request.user)
        if err:
            return err

        ser = TemplateSyncSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        template_ids = ser.validated_data["template_ids"]

        client = GelatoClient(conn.get_api_key())
        now = timezone.now()
        synced: list[GelatoTemplate] = []
        errors: list[dict] = []

        try:
            for tid in template_ids:
                try:
                    data = client.get_template(tid)
                    name = data.get("templateName", data.get("title", tid))
                    preview = data.get("previewUrl", "")
                    tpl, _ = GelatoTemplate.objects.update_or_create(
                        connection=conn,
                        gelato_template_id=tid,
                        defaults={
                            "name": name[:512],
                            "preview_url": preview[:1024] if preview else "",
                            "is_active": True,
                            "synced_at": now,
                        },
                    )
                    synced.append(tpl)
                except GelatoApiError as e:
                    errors.append({"template_id": tid, "detail": e.detail})
        finally:
            client.close()

        result = GelatoTemplateSerializer(synced, many=True).data
        if errors:
            return Response(
                {"templates": result, "errors": errors},
                status=status.HTTP_207_MULTI_STATUS,
            )
        return Response(result)


class GelatoExportView(APIView):
    """POST – upload original artworks to R2, create draft products in Gelato."""

    throttle_scope = "upload"
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        import json as _json

        logger.debug("GelatoExportView.post user=%s", request.user.pk)
        conn, err = _get_connection_or_error(request.user)
        if err:
            return err

        template_id = request.data.get("template_id")
        free_shipping = request.data.get("free_shipping", "false").lower() in ("1", "true", "yes")
        metadata_raw = request.data.get("metadata", "[]")

        try:
            metadata_list: list[dict] = _json.loads(metadata_raw)
        except (ValueError, TypeError):
            metadata_list = []

        logger.debug(
            "template_id=%r free_shipping=%s metadata_count=%s",
            template_id,
            free_shipping,
            len(metadata_list),
        )

        if not template_id:
            return Response(
                {"detail": "template_id ist erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tpl = GelatoTemplate.objects.filter(
            id=template_id, connection=conn, is_active=True
        ).first()
        if not tpl:
            return Response(
                {"detail": "Unbekanntes oder inaktives Template."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        artworks = request.FILES.getlist("artworks")
        logger.debug("artworks=%s MAX_FILE_SIZE=%s", len(artworks), MAX_FILE_SIZE)

        if not artworks:
            return Response(
                {"detail": "Mindestens ein Original-Artwork (artworks) erforderlich."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(artworks) > MAX_BULK_DESIGNS:
            return Response(
                {"detail": f"Maximal {MAX_BULK_DESIGNS} Bilder pro Export."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mb = MAX_FILE_SIZE // (1024 * 1024)
        for f in artworks:
            if f.size and f.size > MAX_FILE_SIZE:
                logger.debug("REJECT %r size=%s", f.name, f.size)
                return Response(
                    {"detail": f"Datei zu groß: {f.name} (max {mb} MB)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        tasks_created: list[GelatoExportTask] = []
        for idx, art_file in enumerate(artworks):
            meta = metadata_list[idx] if idx < len(metadata_list) else {}
            title = str(meta.get("title", art_file.name))[:512]
            description = str(meta.get("description", ""))
            tags = str(meta.get("tags", ""))[:1024]

            logger.debug("[%s] upload %r → R2", idx, art_file.name)
            artwork_url = _upload_to_r2(art_file, "gelato_artworks", request.user)

            task = GelatoExportTask.objects.create(
                user=request.user,
                gelato_template=tpl,
                artwork_r2_url=artwork_url,
                title=title,
                description=description,
                tags=tags,
                free_shipping=free_shipping,
                status=GelatoExportTask.Status.PENDING,
            )
            tasks_created.append(task)
            logger.debug("task %s created title=%r url=%r", task.id, title, artwork_url[:80])

        task_ids = [str(t.id) for t in tasks_created]
        logger.debug("dispatch %s tasks", len(task_ids))
        try:
            process_gelato_bulk_export.delay(task_ids)
        except Exception as exc:
            logger.debug("Celery failed → sync: %r", exc)
            logger.warning("Celery broker unavailable – running export synchronously")
            process_gelato_bulk_export(task_ids)

        return Response(
            GelatoExportTaskSerializer(tasks_created, many=True).data,
            status=status.HTTP_202_ACCEPTED,
        )


class GelatoTaskStatusView(APIView):
    """GET – polling endpoint for task status. Usage: ?task_ids=uuid1,uuid2,..."""

    def get(self, request):
        raw = request.query_params.get("task_ids", "")
        ids = [x.strip() for x in raw.split(",") if x.strip()]
        if not ids:
            return Response([])

        tasks = GelatoExportTask.objects.filter(id__in=ids, user=request.user)
        return Response(GelatoExportTaskSerializer(tasks, many=True).data)


class UploadTempDesignView(APIView):
    """POST – upload a single image to Cloudflare R2 and return its public URL."""

    throttle_scope = "upload"
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        ser = TemporaryDesignUploadSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)

        image = ser.validated_data["image"]
        if image.size and image.size > 25 * 1024 * 1024:
            return Response(
                {"detail": f"Datei zu groß: {image.name} (max 25 MB)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj = ser.save()
        return Response(
            TemporaryDesignUploadSerializer(obj).data,
            status=status.HTTP_201_CREATED,
        )
