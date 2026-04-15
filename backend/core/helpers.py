"""Gemeinsame Hilfsfunktionen für core Views/Serializers."""

from __future__ import annotations

import io
from typing import Any, BinaryIO

from PIL import Image


def _parse_boolish(v: Any) -> bool | None:
    if v is None:
        return None
    if v is True:
        return True
    if v is False:
        return False
    s = str(v).lower()
    if s in ("1", "true", "yes"):
        return True
    if s in ("0", "false", "no", ""):
        return False
    return None


def _clamp_sides_mask(v: Any) -> int | None:
    try:
        i = int(v)
        return max(0, min(15, i))
    except (TypeError, ValueError):
        return None


def _clamp_float(v: Any, lo: float, hi: float, default: float) -> float:
    if v is None:
        return default
    try:
        n = float(v)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, n))


VALID_FRAME_STYLES = ("none", "black", "white", "wood")


def read_image_dimensions(source: BinaryIO | bytes) -> tuple[int, int]:
    """Liest Breite und Höhe aus File-Upload oder Bytes."""
    data = source if isinstance(source, bytes) else source.read()
    with Image.open(io.BytesIO(data)) as im:
        return im.size


def apply_frame_fields(
    template: Any,
    data: dict[str, Any],
    *,
    allow_legacy: bool = True,
    set_defaults: bool = False,
) -> None:
    """
    Setzt Frame/Schatten/Sättigung aus einem Dict auf ein Template-Objekt.
    Wird von import_set, partial_update und ggf. add_template genutzt.
    """
    raw_dfs = data.get("default_frame_style", data.get("defaultFrameStyle"))
    if raw_dfs is not None:
        v = str(raw_dfs)
        if v in VALID_FRAME_STYLES:
            template.default_frame_style = v
    elif set_defaults:
        template.default_frame_style = "none"

    outer_b = _parse_boolish(
        data.get("frame_shadow_outer_enabled", data.get("frameShadowOuterEnabled"))
    )
    inner_b = _parse_boolish(
        data.get("frame_shadow_inner_enabled", data.get("frameShadowInnerEnabled"))
    )

    had_new_outer = outer_b is not None
    had_new_inner = inner_b is not None

    if had_new_outer:
        template.frame_shadow_outer_enabled = outer_b
    elif set_defaults:
        template.frame_shadow_outer_enabled = False

    if had_new_inner:
        template.frame_shadow_inner_enabled = inner_b
    elif set_defaults:
        template.frame_shadow_inner_enabled = False

    if allow_legacy and not had_new_outer and not had_new_inner:
        raw_dir = data.get("frame_shadow_direction", data.get("frameShadowDirection"))
        raw_legacy = data.get("frame_drop_shadow", data.get("frameDropShadow"))
        if raw_dir is not None or raw_legacy is not None:
            d = str(raw_dir or "none").lower()
            if d in ("outward", "out", "external"):
                template.frame_shadow_outer_enabled = True
                template.frame_shadow_inner_enabled = False
            elif d in ("inward", "in", "internal"):
                template.frame_shadow_outer_enabled = False
                template.frame_shadow_inner_enabled = True
            elif raw_legacy is not None and raw_dir is None:
                template.frame_shadow_outer_enabled = _parse_boolish(raw_legacy) or False
                template.frame_shadow_inner_enabled = False
            elif d == "none":
                template.frame_shadow_outer_enabled = False
                template.frame_shadow_inner_enabled = False

    raw_os = _clamp_sides_mask(data.get("frame_outer_sides", data.get("frameOuterSides")))
    if raw_os is not None:
        template.frame_outer_sides = raw_os
    elif set_defaults:
        template.frame_outer_sides = 15

    raw_is = _clamp_sides_mask(data.get("frame_inner_sides", data.get("frameInnerSides")))
    if raw_is is not None:
        template.frame_inner_sides = raw_is
    elif set_defaults:
        template.frame_inner_sides = 15

    raw_depth = data.get("frame_shadow_depth", data.get("frameShadowDepth"))
    if raw_depth is not None:
        template.frame_shadow_depth = _clamp_float(raw_depth, 0.15, 1.0, 0.82)
    elif set_defaults:
        template.frame_shadow_depth = 0.82

    raw_sat = data.get("artwork_saturation", data.get("artworkSaturation"))
    if raw_sat is not None:
        template.artwork_saturation = _clamp_float(raw_sat, 0.15, 1.0, 1.0)
    elif set_defaults:
        template.artwork_saturation = 1.0
