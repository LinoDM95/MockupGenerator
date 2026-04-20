"""Mandantenfähige Objektspeicher-Pfade (R2/S3) — konsistent ``…/users/<id>/…``."""

from __future__ import annotations

import os
import uuid

from django.utils import timezone

from .object_storage_layout import P_CORE_TEMPLATE_BACKGROUNDS


def template_background_upload_to(instance, filename: str) -> str:
    """``ce/core/template_backgrounds/users/<user_id>/YYYY/MM/<uuid>.<ext>``"""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    template_set = getattr(instance, "template_set", None)
    if template_set is None and getattr(instance, "template_set_id", None):
        from django.apps import apps

        TemplateSet = apps.get_model("core", "TemplateSet")
        template_set = (
            TemplateSet.objects.filter(pk=instance.template_set_id).only("user_id").first()
        )
    user_id = template_set.user_id if template_set is not None else "unknown"
    now = timezone.now()
    return (
        f"{P_CORE_TEMPLATE_BACKGROUNDS}/users/{user_id}/"
        f"{now:%Y}/{now:%m}/{uuid.uuid4().hex}{ext}"
    )
