"""Etsy-Access-Token frisch halten (Refresh vor Ablauf)."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from ..models import EtsyConnection

from .etsy_client import refresh_access_token


def ensure_fresh_access_token(conn: EtsyConnection) -> str:
    """
    Liefert ein gültiges Access-Token; refresht bei Bedarf.
    Speichert neue Tokens in conn (ohne Klartext zu loggen).
    """
    skew = timedelta(seconds=90)
    now = timezone.now()
    needs_refresh = (
        not conn.expires_at
        or conn.expires_at <= now + skew
        or not conn.get_access_token()
    )
    if not needs_refresh:
        return conn.get_access_token()

    rt = conn.get_refresh_token()
    if not rt:
        raise ValueError("Kein Refresh-Token – Etsy erneut verknüpfen.")

    data = refresh_access_token(refresh_token=rt)
    conn.set_access_token(data.get("access_token", ""))
    if data.get("refresh_token"):
        conn.set_refresh_token(data["refresh_token"])
    expires_in = int(data.get("expires_in", 3600))
    conn.expires_at = now + timedelta(seconds=expires_in)
    conn.save(
        update_fields=[
            "access_token_enc",
            "refresh_token_enc",
            "expires_at",
            "updated_at",
        ],
    )
    access = conn.get_access_token()
    if not access:
        raise ValueError("Token-Refresh lieferte kein Access-Token.")
    return access
