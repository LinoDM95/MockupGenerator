"""File validators beyond extension checks (OWASP A03)."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_FORMATS = frozenset({"JPEG", "PNG", "WEBP", "GIF"})


def validate_real_image(file) -> None:
    """Validate image by magic bytes (Pillow), not filename."""
    pos = getattr(file, "tell", lambda: 0)()
    try:
        file.seek(0)
        with Image.open(file) as img:
            img.verify()
        file.seek(0)
        with Image.open(file) as img2:
            fmt = img2.format
        if fmt not in ALLOWED_IMAGE_FORMATS:
            raise ValidationError(f"Bildformat nicht erlaubt: {fmt}")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValidationError("Datei ist kein gültiges Bild.") from exc
    finally:
        try:
            file.seek(pos)
        except (OSError, AttributeError, TypeError):
            pass
