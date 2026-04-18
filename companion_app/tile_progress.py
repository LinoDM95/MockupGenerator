"""Thread-sicherer Kachel-Fortschritt fuer GET /tile-progress/{job_id} (Polling)."""

from __future__ import annotations

import re
import threading
from typing import Any

_LOCK = threading.Lock()
_JOBS: dict[str, dict[str, Any]] = {}

_JOB_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{8,128}$")


def is_valid_job_id(job_id: str | None) -> bool:
    if not job_id or not isinstance(job_id, str):
        return False
    return bool(_JOB_ID_RE.match(job_id.strip()))


def reset_job(job_id: str, total_tiles: int) -> None:
    if not is_valid_job_id(job_id):
        return
    tid = max(1, int(total_tiles))
    jid = job_id.strip()
    with _LOCK:
        _JOBS[jid] = {
            "total_tiles": tid,
            "tile_durations_ms": [],
            "finished": False,
        }


def tile_done(job_id: str | None, duration_ms: float) -> None:
    if not is_valid_job_id(job_id):
        return
    jid = job_id.strip()
    try:
        dm = float(duration_ms)
    except (TypeError, ValueError):
        dm = 0.0
    if dm < 0 or dm > 3_600_000 or dm != dm:
        dm = 0.0
    with _LOCK:
        j = _JOBS.get(jid)
        if not j or j.get("finished"):
            return
        hist = j.get("tile_durations_ms")
        if not isinstance(hist, list):
            hist = []
        hist.append(dm)
        j["tile_durations_ms"] = hist[-96:]


def finish_job(job_id: str | None) -> None:
    if not is_valid_job_id(job_id):
        return
    jid = job_id.strip()
    with _LOCK:
        j = _JOBS.get(jid)
        if j:
            j["finished"] = True


def get_snapshot(job_id: str) -> dict[str, Any] | None:
    if not is_valid_job_id(job_id):
        return None
    jid = job_id.strip()
    with _LOCK:
        j = _JOBS.get(jid)
        if not j:
            return None
        return {
            "total_tiles": int(j.get("total_tiles", 1)),
            "completed_tiles": len(j.get("tile_durations_ms") or []),
            "tile_durations_ms": list(j.get("tile_durations_ms") or []),
            "finished": bool(j.get("finished")),
        }
