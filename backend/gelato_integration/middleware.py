"""Löst periodische R2-Temp-Bereinigung bei API-Traffic aus (ohne Celery Beat)."""

from __future__ import annotations

from typing import Callable

from django.http import HttpRequest, HttpResponse

from .r2_cleanup import cleanup_expired_r2_temp_uploads


class R2TempCleanupMiddleware:
    """Ruft die abgesicherte Cleanup-Funktion höchstens alle *Cooldown*-Sekunden auf."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.path.startswith("/api/"):
            cleanup_expired_r2_temp_uploads()
        return self.get_response(request)
