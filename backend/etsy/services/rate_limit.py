"""Einfache Ratenbegrenzung für sequentielle Etsy-API-Aufrufe (ca. 10 RPS)."""

from __future__ import annotations

import threading
import time
from typing import Final


class EtsyRateLimiter:
    """Mindestabstand zwischen Aufrufen (Thread-sicher)."""

    def __init__(self, requests_per_second: float) -> None:
        self._min_interval: Final[float] = 1.0 / max(requests_per_second, 0.1)
        self._lock = threading.Lock()
        self._last = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            wait_for = self._min_interval - (now - self._last)
            if wait_for > 0:
                time.sleep(wait_for)
            self._last = time.monotonic()
