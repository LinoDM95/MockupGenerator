"""PrintFlow Engine: Datenverzeichnis (Dev vs. PyInstaller onefile)."""

from __future__ import annotations

import sys
from pathlib import Path


def companion_dir() -> Path:
    """Directory beside the executable (frozen) or the companion_app package (dev)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent
