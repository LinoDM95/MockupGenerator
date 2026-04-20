"""Bereinigung abgelaufener Temp-Designs auf R2 — ohne Celery über Middleware + Upload-Hook.

Es werden nur ``TemporaryDesignUpload``-Zeilen unter ``ce/gelato/temp_designs/users/…``
(bzw. ältere Keys ``temp_designs/users/…``) entfernt.
Dauerhafte Vorlagen-Hintergründe (``ce/core/template_backgrounds/…``) werden nicht angefasst.

Bei Bedarf: ``force=True`` (Management-Command, optionaler Celery-Task) ignoriert Cooldown.
"""

from __future__ import annotations

import logging
import time
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import TemporaryDesignUpload

logger = logging.getLogger(__name__)

_last_cleanup_mono: float = 0.0


def cleanup_expired_r2_temp_uploads(*, force: bool = False) -> int:
    """Löscht ``TemporaryDesignUpload`` älter als konfigurierte Stunden inkl. R2-Objekt.

    :param force: wenn True, Cooldown ignorieren (Cron/Management-Command/Celery-Task).
    :returns: Anzahl gelöschter Datensätze.
    """
    global _last_cleanup_mono

    max_age_h = int(getattr(settings, "R2_TEMP_DESIGN_MAX_AGE_HOURS", 24))
    cooldown = float(getattr(settings, "R2_TEMP_CLEANUP_COOLDOWN_SECONDS", 300))

    if not force:
        now = time.monotonic()
        if now - _last_cleanup_mono < cooldown:
            return 0
        _last_cleanup_mono = now

    cutoff = timezone.now() - timedelta(hours=max_age_h)
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
        logger.info(
            "R2 temp design cleanup: removed %d expired row(s) (>%sh).",
            count,
            max_age_h,
        )

    if force:
        _last_cleanup_mono = time.monotonic()

    return count
