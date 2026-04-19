"""Max. Ausgabe-Pixel pro Kachel beim Tiling (Vertex/Django).

Umgebung: UPSCALE_MAX_OUTPUT_PIXELS (Integer), Standard 17_000_000.
Logik mit companion_app/upscale_limits.py uebereinstimmen (Konsistenz).

Groessere Werte = weniger/groessere Kacheln; API/GPU-Grenzen beachten.
8x/16x-Upscaling laeuft intern als Kette mehrerer 2x-/4x-Paesse und erreicht
Pixelbudget-Grenzen entsprechend schneller.
"""

from __future__ import annotations

import os

_DEFAULT = 17_000_000
_MIN = 4_000_000
_MAX = 67_108_864  # 8192 * 8192; Obergrenze fuer Ziel-Pixel (Breite*Hoehe)


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
