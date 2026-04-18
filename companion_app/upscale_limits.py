"""Max. Ausgabe-Pixel pro Kachel beim Tiling (lokal + sollte mit Backend uebereinstimmen).

Umgebung: UPSCALE_MAX_OUTPUT_PIXELS (Integer), Standard 17_000_000.
Groessere Werte = weniger/groessere Kacheln, mehr GPU-VRAM-Risiko.
"""

from __future__ import annotations

import os

_DEFAULT = 17_000_000
# Sinnvolles Unterlimit (~2000^2), Deckel gegen Tippfehler/extremes OOM
_MIN = 4_000_000
_MAX = 67_108_864  # 8192 * 8192


def get_max_output_pixels() -> int:
    raw = (os.environ.get("UPSCALE_MAX_OUTPUT_PIXELS") or "").strip()
    if not raw:
        return _DEFAULT
    try:
        v = int(raw)
    except ValueError:
        return _DEFAULT
    return max(_MIN, min(v, _MAX))


MAX_OUTPUT_PIXELS = get_max_output_pixels()
