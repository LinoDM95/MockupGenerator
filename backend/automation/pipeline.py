"""
Synchrone Automation-Pipeline (ohne Celery/Redis).

POST /api/automation/jobs/ blockiert, bis alle Motive verarbeitet und das ZIP
fertig ist — bei vielen Bildern ggf. hohe Latenz; später optional wieder Queue + Worker.
"""

from __future__ import annotations

import logging
import os
import zipfile
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction

from .models import AutomationJob, ImageTask
from .services import (
    service_export_to_gelato,
    service_generate_seo,
    service_render_server_mockups,
    service_upscale_image,
)

logger = logging.getLogger(__name__)


def _finalize_job_zip(job_id: str, media_root: Path) -> None:
    with transaction.atomic():
        try:
            job = AutomationJob.objects.select_for_update().get(pk=job_id)
        except AutomationJob.DoesNotExist:
            return
        if job.result_zip:
            return
        total = job.tasks.count()
        if total == 0:
            job.status = AutomationJob.Status.COMPLETED
            job.save(update_fields=["status", "updated_at"])
            return

        terminal = job.tasks.filter(
            status__in=[ImageTask.Status.DONE, ImageTask.Status.ERROR],
        ).count()
        if terminal < total:
            return

        done_qs = job.tasks.filter(status=ImageTask.Status.DONE).order_by(
            "created_at",
        )
        if not done_qs.exists():
            job.status = AutomationJob.Status.FAILED
            job.error_message = (
                "Alle Motive sind fehlgeschlagen; es gibt keine erfolgreichen Ergebnisse "
                "für das ZIP."
            )
            job.save(update_fields=["status", "error_message", "updated_at"])
            logger.warning(
                "finalize_job job=%s failed: no successful ImageTasks",
                job_id,
            )
            return

        buf = BytesIO()
        added = 0
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for t in done_qs.iterator():
                base = Path(t.original_image.name).stem[:60] or str(t.id)[:8]
                for rel in t.mockup_paths or []:
                    abs_path = media_root / rel.replace("/", os.sep)
                    if not abs_path.is_file():
                        logger.warning(
                            "Missing mockup file for zip: %s", abs_path
                        )
                        continue
                    leaf = Path(rel).name
                    arc = f"{base}/{leaf}"
                    zf.write(abs_path, arcname=arc)
                    added += 1
            if added == 0:
                raise ValueError(
                    "ZIP konnte nicht erstellt werden: keine Mockup-Dateien auf der "
                    "Platte gefunden (erwartete Pfade fehlen oder waren leer)."
                )

        buf.seek(0)
        name = f"automation_job_{job_id}.zip"
        job.result_zip.save(name, ContentFile(buf.getvalue()), save=False)
        job.status = AutomationJob.Status.COMPLETED
        job.error_message = ""
        job.save(update_fields=["result_zip", "status", "error_message", "updated_at"])
        logger.info("finalize_job job=%s zip_files_added=%s", job_id, added)


def finalize_job(job_id: str) -> None:
    """Alle Mockup-PNGs erfolgreicher Tasks packen; idempotent."""
    media_root = Path(settings.MEDIA_ROOT)

    try:
        _finalize_job_zip(job_id, media_root)
    except Exception as exc:
        logger.exception("finalize_job failed job=%s", job_id)
        AutomationJob.objects.filter(pk=job_id).update(
            status=AutomationJob.Status.FAILED,
            error_message=str(exc)[:4000],
        )


def process_single_image(task_id: str) -> None:
    """Upscale → SEO → Mockups → Gelato für ein Motiv; Fehler isolieren."""
    try:
        task = ImageTask.objects.select_related("job").get(pk=task_id)
    except ImageTask.DoesNotExist:
        logger.warning("process_single_image: missing task_id=%s", task_id)
        return

    job = task.job

    try:
        task.status = ImageTask.Status.UPSCALING
        task.error_message = ""
        task.save(update_fields=["status", "error_message", "updated_at"])

        service_upscale_image(task)
        task.refresh_from_db()

        task.status = ImageTask.Status.SEO
        task.save(update_fields=["status", "updated_at"])
        service_generate_seo(task, job.ai_model_name)
        task.refresh_from_db()

        task.status = ImageTask.Status.MOCKUPS
        task.save(update_fields=["status", "updated_at"])
        service_render_server_mockups(task, job.mockup_set)
        task.refresh_from_db()

        task.status = ImageTask.Status.GELATO
        task.save(update_fields=["status", "updated_at"])
        service_export_to_gelato(task, job.gelato_profile)

        task.status = ImageTask.Status.DONE
        task.save(update_fields=["status", "updated_at"])
    except Exception as exc:
        logger.exception("ImageTask %s failed", task_id)
        task.refresh_from_db()
        task.status = ImageTask.Status.ERROR
        task.error_message = str(exc)[:4000]
        task.save(update_fields=["status", "error_message", "updated_at"])
