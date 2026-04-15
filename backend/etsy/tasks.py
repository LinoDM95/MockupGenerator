"""
Celery: Bulk-Bilder für Etsy-Listings.
Löscht zuerst Bilder mit höherem rank (siehe Etsy-Doku zu Listing-Images),
lädt neue per Multipart hoch.
"""

from __future__ import annotations

import logging
from pathlib import Path
from uuid import UUID

import httpx
from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .models import EtsyBulkAsset, EtsyBulkJob, EtsyConnection
from .services.etsy_client import EtsyOpenApiClient
from .services.normalize import get_image_id, get_image_rank, get_results
from .services.rate_limit import EtsyRateLimiter
from .services.tokens import ensure_fresh_access_token

logger = logging.getLogger(__name__)


@shared_task(bind=True, ignore_result=True)
def process_etsy_bulk_job(self, job_id: str) -> None:
    job = EtsyBulkJob.objects.filter(id=job_id).select_related("user").first()
    if not job:
        logger.error("EtsyBulkJob nicht gefunden: %s", job_id)
        return

    conn = EtsyConnection.objects.filter(user=job.user).first()
    if not conn or not conn.shop_id:
        job.status = EtsyBulkJob.Status.FAILED
        job.error_log = "Keine Shop-Verknüpfung."
        job.save(update_fields=["status", "error_log", "updated_at"])
        return

    job.status = EtsyBulkJob.Status.RUNNING
    job.result = {"errors": [], "done": []}
    job.save(update_fields=["status", "result", "updated_at"])

    rate = EtsyRateLimiter(settings.ETSY_API_RPS)

    def refresh_fn():
        conn.refresh_from_db()
        return ensure_fresh_access_token(conn)

    try:
        access = ensure_fresh_access_token(conn)
    except Exception as e:
        job.status = EtsyBulkJob.Status.FAILED
        job.error_log = str(e)
        job.save(update_fields=["status", "error_log", "updated_at"])
        return

    client = EtsyOpenApiClient(access, rate_limiter=rate)
    items = job.payload.get("items") or []
    errors: list[dict] = []
    done: list[dict] = []

    try:
        for item in items:
            listing_id = int(item["listing_id"])
            shop_id = int(conn.shop_id)

            try:
                imgs_json = client.get_json(
                    f"/shops/{shop_id}/listings/{listing_id}/images",
                    refresh_fn=refresh_fn,
                )
            except httpx.HTTPStatusError as e:
                errors.append(
                    {
                        "listing_id": listing_id,
                        "phase": "list_images",
                        "detail": e.response.text[:500],
                        "status": e.response.status_code,
                    },
                )
                continue

            current = get_results(imgs_json)
            id_to_rank = {}
            for im in current:
                iid = get_image_id(im)
                if iid is not None:
                    id_to_rank[iid] = get_image_rank(im)

            delete_ids = [int(x) for x in (item.get("deletes") or [])]

            ranked_deletes = sorted(
                delete_ids,
                key=lambda x: id_to_rank.get(x, 0),
                reverse=True,
            )

            for img_id in ranked_deletes:
                try:
                    r = client.delete(
                        f"/shops/{shop_id}/listings/{listing_id}/images/{img_id}",
                        refresh_fn=refresh_fn,
                    )
                    if r.status_code not in (200, 204, 404):
                        errors.append(
                            {
                                "listing_id": listing_id,
                                "phase": "delete",
                                "listing_image_id": img_id,
                                "status": r.status_code,
                                "detail": r.text[:500],
                            },
                        )
                except httpx.HTTPStatusError as e:
                    errors.append(
                        {
                            "listing_id": listing_id,
                            "phase": "delete",
                            "listing_image_id": img_id,
                            "status": e.response.status_code,
                            "detail": e.response.text[:500],
                        },
                    )

            for up in item.get("uploads") or []:
                aid = up["asset_id"]
                if isinstance(aid, str):
                    aid = UUID(aid)
                rank = int(up["rank"])
                asset = EtsyBulkAsset.objects.filter(id=aid, user=job.user).first()
                if not asset:
                    errors.append(
                        {
                            "listing_id": listing_id,
                            "phase": "upload",
                            "detail": f"Asset {aid} fehlt",
                        },
                    )
                    continue
                path = Path(asset.image.path)
                if not path.is_file():
                    errors.append(
                        {
                            "listing_id": listing_id,
                            "phase": "upload",
                            "detail": f"Datei fehlt: {path}",
                        },
                    )
                    continue
                mime = "image/png"
                suf = path.suffix.lower()
                if suf in (".jpg", ".jpeg"):
                    mime = "image/jpeg"
                elif suf == ".webp":
                    mime = "image/webp"
                try:
                    with path.open("rb") as f:
                        r = client.post_multipart(
                            f"/shops/{shop_id}/listings/{listing_id}/images",
                            files={"image": (path.name, f, mime)},
                            data={"rank": str(rank)},
                            refresh_fn=refresh_fn,
                        )
                    if r.status_code not in (200, 201):
                        errors.append(
                            {
                                "listing_id": listing_id,
                                "phase": "upload",
                                "rank": rank,
                                "status": r.status_code,
                                "detail": r.text[:500],
                            },
                        )
                    else:
                        done.append({"listing_id": listing_id, "rank": rank})
                except httpx.HTTPStatusError as e:
                    errors.append(
                        {
                            "listing_id": listing_id,
                            "phase": "upload",
                            "rank": rank,
                            "status": e.response.status_code,
                            "detail": e.response.text[:500],
                        },
                    )

        job.result = {"errors": errors, "done": done}
        if errors and done:
            job.status = EtsyBulkJob.Status.PARTIAL
        elif errors:
            job.status = EtsyBulkJob.Status.FAILED
        else:
            job.status = EtsyBulkJob.Status.SUCCESS
        job.error_log = "\n".join(str(e) for e in errors[:50])
        job.updated_at = timezone.now()
        job.save(update_fields=["status", "result", "error_log", "updated_at"])
    finally:
        client.close()
