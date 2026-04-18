"""Liest die gemeinsame Engine-Versionsdatei (dev + PyInstaller onefile)."""

from __future__ import annotations

import sys
from pathlib import Path

_VERSION_NAME = "ENGINE_VERSION"


def engine_version_string() -> str:
    if getattr(sys, "frozen", False):
        base = Path(getattr(sys, "_MEIPASS", Path.cwd()))
        path = base / "companion_app" / _VERSION_NAME
    else:
        path = Path(__file__).resolve().parent / _VERSION_NAME
    if path.is_file():
        first = path.read_text(encoding="utf-8").strip().splitlines()
        if first and first[0].strip():
            return first[0].strip()
    return "0.0.0"
