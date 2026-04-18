"""Celery tasks for the Gelato integration."""

from __future__ import annotations

import logging
import re

from celery import shared_task
from django.utils import timezone

from .models import GelatoConnection, GelatoExportTask
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
    logger.debug("process_gelato_bulk_export START task_ids=%s", task_ids)
    if not task_ids:
        logger.debug("process_gelato_bulk_export empty task_ids → exit")
        return

    first_task = GelatoExportTask.objects.filter(id=task_ids[0]).select_related("user").first()
    if not first_task:
        logger.error("GelatoExportTask not found: %s", task_ids[0])
        logger.debug("first_task missing id=%r", task_ids[0])
        return

    conn = GelatoConnection.objects.filter(user=first_task.user, is_active=True).first()
    if not conn:
        logger.debug("no active GelatoConnection for user")
        GelatoExportTask.objects.filter(id__in=task_ids).update(
            status=GelatoExportTask.Status.FAILED,
            error_message="Keine aktive Gelato-Verbindung.",
            updated_at=timezone.now(),
        )
        return

    logger.debug(
        "connection store_id=%r store_name=%r",
        conn.store_id,
        conn.store_name,
    )
    client = GelatoClient(conn.get_api_key())

    # Cache variant payloads per Gelato template to avoid repeated API calls.
    variants_cache: dict[str, list[dict]] = {}

    try:
        for tid in task_ids:
            logger.debug("--- task loop tid=%r ---", tid)
            task = GelatoExportTask.objects.filter(id=tid).select_related("gelato_template").first()
            if not task:
                logger.debug("task row missing, skip tid=%r", tid)
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
                logger.debug(
                    "gelato_tpl_id=%r title=%r artwork_r2_url_preview=%r",
                    gelato_tpl_id,
                    task.title,
                    art_preview,
                )

                if not task.artwork_r2_url:
                    raise ValueError(
                        "Keine R2-URL für das Original-Artwork vorhanden. "
                        "Das Bild wurde nicht zu Cloudflare R2 hochgeladen."
                    )

                if gelato_tpl_id not in variants_cache:
                    logger.debug("build_variants_payload (cache miss) tpl=%r", gelato_tpl_id)
                    variants_cache[gelato_tpl_id] = client.build_variants_payload(
                        gelato_tpl_id, task.artwork_r2_url,
                    )
                    logger.debug(
                        "variants_cache[%r] len=%s",
                        gelato_tpl_id,
                        len(variants_cache[gelato_tpl_id]),
                    )
                else:
                    logger.debug(
                        "variants cache HIT → reinject artwork URL for tpl=%r",
                        gelato_tpl_id,
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
                logger.debug(
                    "create_product_from_template store=%r variants_count=%s",
                    conn.store_id,
                    len(v_payload) if v_payload else 0,
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
                logger.debug(
                    "Gelato API OK id=%s productUid=%s",
                    product_id,
                    result.get("productUid"),
                )

                if product_id:
                    deleted = client.delete_all_product_images(conn.store_id, product_id)
                    logger.debug("deleted %s auto-generated mockup images", deleted)

                task.gelato_product_id = product_id
                task.gelato_product_uid = str(result.get("productUid", ""))
                task.status = GelatoExportTask.Status.SUCCESS
                task.save(update_fields=[
                    "status", "gelato_product_id", "gelato_product_uid", "updated_at",
                ])

            except GelatoApiError as e:
                logger.debug(
                    "GelatoApiError status=%s detail=%r",
                    e.status_code,
                    e.detail[:300],
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
                logger.debug("unexpected error tid=%r: %r", tid, e)
                logger.exception("Unexpected error exporting task %s", tid)
                task.status = GelatoExportTask.Status.FAILED
                task.error_message = str(e)[:1000]
                task.save(update_fields=["status", "error_message", "updated_at"])
    finally:
        logger.debug("process_gelato_bulk_export client.close()")
        client.close()


@shared_task(ignore_result=True)
def cleanup_r2_temp_designs() -> None:
    """Optional: gleiche Logik wie Middleware — braucht Celery nur wenn ihr Beat nutzt.

    Ohne Celery: ``cleanup_expired_r2_temp_uploads`` über Middleware + Management-Command.
    """
    from .r2_cleanup import cleanup_expired_r2_temp_uploads

    cleanup_expired_r2_temp_uploads(force=True)
