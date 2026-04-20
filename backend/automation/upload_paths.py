"""Automation: Objektschlüssel unter ``ce/automation/jobs/…``."""

from __future__ import annotations

import os

from core.object_storage_layout import P_AUTOMATION


def automation_job_result_upload_to(instance, filename: str) -> str:
    """Ergebnis-ZIP pro Job."""
    return f"{P_AUTOMATION}/jobs/{instance.pk}/results/{filename}"


def image_task_original_upload_to(instance, filename: str) -> str:
    """Hochgeladenes Motiv pro Task."""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".png"
    return (
        f"{P_AUTOMATION}/jobs/{instance.job_id}/tasks/{instance.pk}/original{ext}"
    )


def image_task_high_res_upload_to(instance, filename: str) -> str:
    """Upscale-Ausgabe (Dateiname z. B. ``hr_<uuid>.png``)."""
    return f"{P_AUTOMATION}/jobs/{instance.job_id}/tasks/{instance.pk}/{filename}"
