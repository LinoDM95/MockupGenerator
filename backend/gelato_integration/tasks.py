"""Celery tasks for the Gelato integration."""

from __future__ import annotations

import logging
import re
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import GelatoConnection, GelatoExportTask, TemporaryDesignUpload
from .services import GelatoApiError, GelatoClient

logger = logging.getLogger(__name__)

_TAG_ILLEGAL_CHARS = re.compile(r"[^a-zA-Z0-9\s]")
_TAG_MULTI_SPACE = re.compile(r"\s+")


def _sanitize_gelato_tags(raw: str) -> list[str]:
    """Gelato only allows letters, numbers and whitespace in tags."""
    tags: list[str] = []
    for part in raw.split(","):
        cleaned = _TAG_ILLEGAL_CHARS.sub(" ", part)
        cleaned = _TAG_MULTI_SPACE.sub(" ", cleaned).strip()
        if cleaned:
            tags.append(cleaned)
    return tags


@shared_task(bind=True, ignore_result=True, max_retries=3)
def process_gelato_bulk_export(self, task_ids: list[str]) -> None:
    print(f"[gelato DEBUG] process_gelato_bulk_export START task_ids={task_ids}", flush=True)
    if not task_ids:
        print("[gelato DEBUG] process_gelato_bulk_export empty task_ids → exit", flush=True)
        return

    first_task = GelatoExportTask.objects.filter(id=task_ids[0]).select_related("user").first()
    if not first_task:
        logger.error("GelatoExportTask not found: %s", task_ids[0])
        print(f"[gelato DEBUG] first_task missing id={task_ids[0]!r}", flush=True)
        return

    conn = GelatoConnection.objects.filter(user=first_task.user, is_active=True).first()
    if not conn:
        print("[gelato DEBUG] no active GelatoConnection for user", flush=True)
        GelatoExportTask.objects.filter(id__in=task_ids).update(
            status=GelatoExportTask.Status.FAILED,
            error_message="Keine aktive Gelato-Verbindung.",
            updated_at=timezone.now(),
        )
        return

    print(
        f"[gelato DEBUG] connection store_id={conn.store_id!r} store_name={conn.store_name!r}",
        flush=True,
    )
    client = GelatoClient(conn.get_api_key())

    # Cache variant payloads per Gelato template to avoid repeated API calls.
    variants_cache: dict[str, list[dict]] = {}

    try:
        for tid in task_ids:
            print(f"[gelato DEBUG] --- task loop tid={tid!r} ---", flush=True)
            task = GelatoExportTask.objects.filter(id=tid).select_related("gelato_template").first()
            if not task:
                print(f"[gelato DEBUG] task row missing, skip tid={tid!r}", flush=True)
                continue

            task.status = GelatoExportTask.Status.PROCESSING
            task.save(update_fields=["status", "updated_at"])

            try:
                gelato_tpl_id = (
                    task.gelato_template.gelato_template_id
                    if task.gelato_template
                    else ""
                )
                art_preview = (task.artwork_r2_url or "")[:100]
                print(
                    f"[gelato DEBUG] gelato_tpl_id={gelato_tpl_id!r} title={task.title!r} "
                    f"artwork_r2_url_preview={art_preview!r}",
                    flush=True,
                )

                if not task.artwork_r2_url:
                    raise ValueError(
                        "Keine R2-URL für das Original-Artwork vorhanden. "
                        "Das Bild wurde nicht zu Cloudflare R2 hochgeladen."
                    )

                if gelato_tpl_id not in variants_cache:
                    print(
                        f"[gelato DEBUG] build_variants_payload (cache miss) tpl={gelato_tpl_id!r}",
                        flush=True,
                    )
                    variants_cache[gelato_tpl_id] = client.build_variants_payload(
                        gelato_tpl_id, task.artwork_r2_url,
                    )
                    print(
                        f"[gelato DEBUG] variants_cache[{gelato_tpl_id!r}] "
                        f"len={len(variants_cache[gelato_tpl_id])}",
                        flush=True,
                    )
                else:
                    print(
                        f"[gelato DEBUG] variants cache HIT → reinject artwork URL for tpl={gelato_tpl_id!r}",
                        flush=True,
                    )
                    # Re-inject the current artwork URL into the cached structure.
                    variants_cache[gelato_tpl_id] = [
                        {
                            **v,
                            "imagePlaceholders": [
                                {**p, "fileUrl": task.artwork_r2_url}
                                for p in v.get("imagePlaceholders", [])
                            ],
                        }
                        for v in variants_cache[gelato_tpl_id]
                    ]

                v_payload = variants_cache[gelato_tpl_id] or None
                print(
                    f"[gelato DEBUG] create_product_from_template store={conn.store_id!r} "
                    f"variants_count={len(v_payload) if v_payload else 0}",
                    flush=True,
                )
                tag_list = _sanitize_gelato_tags(task.tags or "")
                result = client.create_product_from_template(
                    store_id=conn.store_id,
                    template_id=gelato_tpl_id,
                    title=task.title,
                    description=task.description,
                    tags=tag_list or None,
                    free_shipping=task.free_shipping,
                    variants=v_payload,
                )
                product_id = str(result.get("id", ""))
                print(
                    f"[gelato DEBUG] Gelato API OK id={product_id} productUid={result.get('productUid')}",
                    flush=True,
                )

                if product_id:
                    deleted = client.delete_all_product_images(conn.store_id, product_id)
                    print(
                        f"[gelato DEBUG] deleted {deleted} auto-generated mockup images",
                        flush=True,
                    )

                task.gelato_product_id = product_id
                task.gelato_product_uid = str(result.get("productUid", ""))
                task.status = GelatoExportTask.Status.SUCCESS
                task.save(update_fields=[
                    "status", "gelato_product_id", "gelato_product_uid", "updated_at",
                ])

            except GelatoApiError as e:
                print(
                    f"[gelato DEBUG] GelatoApiError status={e.status_code} detail={e.detail[:300]!r}",
                    flush=True,
                )
                task.status = GelatoExportTask.Status.FAILED
                task.error_message = e.detail
                task.save(update_fields=["status", "error_message", "updated_at"])
                if e.status_code >= 500:
                    try:
                        self.retry(exc=e, countdown=2 ** self.request.retries)
                    except self.MaxRetriesExceededError:
                        pass

            except Exception as e:
                print(f"[gelato DEBUG] unexpected error tid={tid!r}: {e!r}", flush=True)
                logger.exception("Unexpected error exporting task %s", tid)
                task.status = GelatoExportTask.Status.FAILED
                task.error_message = str(e)[:1000]
                task.save(update_fields=["status", "error_message", "updated_at"])
    finally:
        print("[gelato DEBUG] process_gelato_bulk_export client.close()", flush=True)
        client.close()


@shared_task(ignore_result=True)
def cleanup_r2_temp_designs() -> None:
    """Delete temporary design uploads older than 24 hours.

    For each expired record the image file is removed from Cloudflare R2
    (via django-storages) before the database row is deleted.
    """
    cutoff = timezone.now() - timedelta(hours=24)
    expired = TemporaryDesignUpload.objects.filter(uploaded_at__lt=cutoff)
    count = 0
    for obj in expired.iterator():
        try:
            if obj.image:
                obj.image.delete(save=False)
        except Exception:
            logger.warning("Failed to delete R2 object for TempDesign %s", obj.pk)
        obj.delete()
        count += 1
    if count:
        logger.info("Cleaned up %d expired temporary design uploads.", count)
