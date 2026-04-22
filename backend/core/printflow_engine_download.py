"""Öffentlicher Download der PrintFlow Engine (EXE) — ohne Login."""

from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponseRedirect

PRINTFLOW_ENGINE_EXE_FILENAME = "PrintFlowEngine.exe"


def printflow_engine_download_view(_request):
    """
    Liefert die Windows-EXE aus oder leitet auf eine externe URL um.

    - ``PRINTFLOW_ENGINE_DOWNLOAD_URL`` (Env): 302 zu Release-Asset / CDN (empfohlen auf Render,
      weil die EXE oft nicht im Repo liegt).
    - Sonst: Datei ``STATIC_ROOT / PrintFlowEngine.exe``, falls nach ``collectstatic`` vorhanden.
    """
    redirect_url = getattr(settings, "PRINTFLOW_ENGINE_DOWNLOAD_URL", "").strip()
    if redirect_url:
        return HttpResponseRedirect(redirect_url)

    path = Path(settings.STATIC_ROOT) / PRINTFLOW_ENGINE_EXE_FILENAME
    if path.is_file():
        return FileResponse(
            path.open("rb"),
            as_attachment=True,
            filename=PRINTFLOW_ENGINE_EXE_FILENAME,
            content_type="application/octet-stream",
        )

    raise Http404(
        "PrintFlow Engine download is not configured (missing file and "
        "PRINTFLOW_ENGINE_DOWNLOAD_URL).",
    )
