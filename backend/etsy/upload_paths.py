"""Etsy: Objektschlüssel unter ``ce/etsy/…``."""

from __future__ import annotations

import os
import uuid

from django.utils import timezone

from core.object_storage_layout import P_ETSY_BULK_ASSETS


def etsy_bulk_asset_upload_to(instance, filename: str) -> str:
    """``ce/etsy/bulk_assets/users/<user_id>/<YYYY>/<MM>/<uuid>.<ext>``"""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".png"
    now = timezone.now()
    uid = instance.user_id if getattr(instance, "user_id", None) else "unknown"
    return (
        f"{P_ETSY_BULK_ASSETS}/users/{uid}/{now:%Y}/{now:%m}/{uuid.uuid4().hex}{ext}"
    )
