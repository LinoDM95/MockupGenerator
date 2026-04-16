from __future__ import annotations

import json
import logging
import math
import os
import time
from io import BytesIO
from typing import Any, Literal, Tuple

from PIL import Image as PILImage

logger = logging.getLogger(__name__)

_DEFAULT_VERTEX_LOCATION = "us-central1"
# Vertex AI / Prediction API require OAuth scope; bare SA creds alone are rejected.
_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"

MAX_OUTPUT_PIXELS = 17_000_000
OVERLAP_SRC = 64
VALID_FACTORS: dict[str, int] = {"x2": 2, "x4": 4}
# Mindest-Skalierung vor Tiling (isotrop), um API-Kacheln zu sparen; zu starke Reduktion vermeiden.
SMART_SCALE_MIN = 0.85


class UpscaleError(Exception):
    pass


class UpscaleAPIError(UpscaleError):
    """Wraps errors from the Imagen API."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class VertexAPINotEnabledError(UpscaleError):
    """Vertex AI API (aiplatform) not enabled for the GCP project."""

    def __init__(self, project_id: str):
        super().__init__("Die Vertex AI API ist nicht aktiviert.")
        self.project_id = project_id


def _get_vertex_client(service_account_json: str) -> Tuple[Any, str]:
    """Create a Vertex AI client from the user's GCP service account JSON (BYOK)."""
    from google import genai
    from google.oauth2 import service_account

    stripped = service_account_json.strip()
    if not stripped:
        raise UpscaleError("Kein Vertex-Service-Account-JSON konfiguriert.")

    try:
        info = json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise UpscaleError("Vertex-Service-Account-JSON ist ungueltig.") from exc

    if not isinstance(info, dict):
        raise UpscaleError("Vertex-Service-Account: erwartet wird ein JSON-Objekt.")

    project_id = info.get("project_id")
    if not project_id:
        raise UpscaleError("Vertex-Service-Account: project_id fehlt.")

    try:
        credentials = service_account.Credentials.from_service_account_info(info)
    except Exception as exc:
        raise UpscaleError(
            "Vertex-Service-Account-JSON konnte nicht gelesen werden. "
            "Bitte pruefen, ob es eine gueltige Google-Dienstkonto-Datei ist."
        ) from exc

    scoped_credentials = credentials.with_scopes([_CLOUD_PLATFORM_SCOPE])

    location = (
        os.environ.get("VERTEX_AI_LOCATION", "") or _DEFAULT_VERTEX_LOCATION
    ).strip()

    client = genai.Client(
        vertexai=True,
        project=project_id,
        location=location,
        credentials=scoped_credentials,
    )
    return client, project_id


def _pil_to_genai_image(pil_img: PILImage.Image):
    """Convert a PIL image to a google-genai Image object."""
    from google.genai import types

    buf = BytesIO()
    fmt = "PNG" if pil_img.mode == "RGBA" else "JPEG"
    pil_img.save(buf, format=fmt, quality=92)
    image_bytes = buf.getvalue()
    return types.Image(image_bytes=image_bytes)


def _genai_image_to_pil(genai_img) -> PILImage.Image:
    """Convert a google-genai Image response back to PIL."""
    if hasattr(genai_img, "image") and hasattr(genai_img.image, "image_bytes"):
        return PILImage.open(BytesIO(genai_img.image.image_bytes))
    if hasattr(genai_img, "image_bytes"):
        return PILImage.open(BytesIO(genai_img.image_bytes))
    raise UpscaleError("Unerwartetes API-Antwortformat.")


def _call_upscale_api(
    client,
    pil_tile: PILImage.Image,
    factor_str: str,
    project_id: str,
    output_mime: str = "image/png",
) -> PILImage.Image:
    """Call the Imagen 4.0 upscale API for a single image/tile."""
    from google.genai import types

    genai_img = _pil_to_genai_image(pil_tile)
    try:
        response = client.models.upscale_image(
            model="imagen-4.0-upscale-preview",
            image=genai_img,
            upscale_factor=factor_str,
            config=types.UpscaleImageConfig(
                output_mime_type=output_mime,
                include_rai_reason=True,
            ),
        )
    except Exception as exc:
        msg = str(exc)
        um = msg.upper()
        if (
            "403" in msg
            or "PERMISSION_DENIED" in um
            or "VERTEX AI API HAS NOT BEEN USED" in um
        ):
            raise VertexAPINotEnabledError(project_id) from exc
        if "401" in msg or "UNAUTHENTICATED" in um:
            raise UpscaleAPIError(
                "Vertex AI Authentifizierung fehlgeschlagen. "
                "Bitte Dienstkonto, Billing und Rolle 'Vertex AI User' pruefen.",
                status_code=401,
            ) from exc
        if "503" in msg or "UNAVAILABLE" in msg.upper():
            raise UpscaleAPIError(
                "Der Upscale-Dienst ist gerade nicht erreichbar. Bitte spaeter erneut versuchen.",
                status_code=503,
            ) from exc
        if "429" in msg or "RESOURCE_EXHAUSTED" in um:
            raise UpscaleAPIError(
                "API-Quota erschoepft. Bitte einige Minuten warten.",
                status_code=429,
            ) from exc
        if "SAFETY" in um or "RAI" in um or "BLOCKED" in um:
            raise UpscaleAPIError(
                "Das Bild wurde vom Sicherheitsfilter blockiert.",
                status_code=400,
            ) from exc
        raise UpscaleAPIError(
            f"Upscale fehlgeschlagen: {msg}",
            status_code=500,
        ) from exc

    if not response.generated_images:
        rai = getattr(response, "rai_reason", None)
        if rai:
            raise UpscaleAPIError(
                f"Das Bild wurde blockiert: {rai}",
                status_code=400,
            )
        raise UpscaleError("Keine Antwort vom Upscale-Dienst erhalten.")

    return _genai_image_to_pil(response.generated_images[0])


def _upscale_single(
    client,
    pil_img: PILImage.Image,
    factor_str: str,
    project_id: str,
) -> PILImage.Image:
    """Upscale the full image in a single API call (output <= 17MP)."""
    logger.info("Single upscale %s with factor %s", pil_img.size, factor_str)
    return _call_upscale_api(client, pil_img, factor_str, project_id)


def _tiling_grid_dims(w: int, h: int, overlap: int, step: int) -> tuple[int, int]:
    """Spalten/Zeilen wie in _upscale_tiled: ceil((dim - overlap) / step), mind. 1."""
    cols = max(1, math.ceil((w - overlap) / step))
    rows = max(1, math.ceil((h - overlap) / step))
    return cols, rows


def _build_blend_mask(
    tile_w: int,
    tile_h: int,
    overlap_out: int,
    *,
    blend_left: bool,
    blend_top: bool,
) -> Any:
    """Build a float32 alpha mask (H, W) with linear feathering in overlap zones."""
    import numpy as np

    mask = np.ones((tile_h, tile_w), dtype=np.float32)

    if blend_left and overlap_out > 0:
        ramp = np.linspace(0.0, 1.0, overlap_out, dtype=np.float32)
        mask[:, :overlap_out] *= ramp[np.newaxis, :]

    if blend_top and overlap_out > 0:
        ramp = np.linspace(0.0, 1.0, overlap_out, dtype=np.float32)
        mask[:overlap_out, :] *= ramp[:, np.newaxis]

    return mask


def _upscale_tiled(
    client,
    pil_img: PILImage.Image,
    factor_int: int,
    project_id: str,
) -> PILImage.Image:
    """Upscale a large image by splitting it into overlapping tiles,
    upscaling each, then blending them back together."""
    try:
        import numpy as np
    except ModuleNotFoundError as exc:
        raise UpscaleError(
            "Fuer grosse Bilder (Tiling) wird NumPy benoetigt. "
            "Bitte im Backend ausfuehren: pip install numpy"
        ) from exc

    factor_str = f"x{factor_int}"
    orig_w, orig_h = pil_img.size
    w, h = orig_w, orig_h

    # floor(sqrt(MAX_OUTPUT_PIXELS)) / factor — max. Kachel in Quellpixeln pro Kante
    max_tile_px = int(math.isqrt(MAX_OUTPUT_PIXELS))
    max_tile_src = max_tile_px // factor_int

    # Ensure a minimum usable tile size
    if max_tile_src < 128:
        raise UpscaleError(
            "Bildaufloesung ist zu hoch fuer den gewaehlten Faktor."
        )

    overlap = min(OVERLAP_SRC, max_tile_src // 4)
    step = max_tile_src - overlap

    cols, rows = _tiling_grid_dims(w, h, overlap, step)
    total_tiles = cols * rows

    # Smart-Scaling: knapp über einer Kachelgrenze isotrop verkleinern, um eine Zeile/Spalte
    # einzusparen (max. ~15 % Fläche), wenn die Gittergrenze das zulässt.
    # w_cap/h_cap: größte Breite/Höhe mit genau cols-1 bzw. rows-1 Kacheln (ceil((dim-overlap)/step)==k).
    smart_scale_applied = False
    candidates: list[tuple[float, str, int, int, int, int]] = []
    if total_tiles > 1:
        if rows > 1:
            h_cap = (rows - 1) * step + overlap
            s_row = h_cap / float(h)
            if s_row < 1.0 and s_row >= SMART_SCALE_MIN - 1e-12:
                w_n = max(1, round(orig_w * s_row))
                h_n = max(1, round(orig_h * s_row))
                c2, r2 = _tiling_grid_dims(w_n, h_n, overlap, step)
                if c2 * r2 < total_tiles:
                    candidates.append((s_row, "fewer_rows", c2, r2, w_n, h_n))
        if cols > 1:
            w_cap = (cols - 1) * step + overlap
            s_col = w_cap / float(w)
            if s_col < 1.0 and s_col >= SMART_SCALE_MIN - 1e-12:
                w_n = max(1, round(orig_w * s_col))
                h_n = max(1, round(orig_h * s_col))
                c2, r2 = _tiling_grid_dims(w_n, h_n, overlap, step)
                if c2 * r2 < total_tiles:
                    candidates.append((s_col, "fewer_cols", c2, r2, w_n, h_n))

        if candidates:
            best_s, how, cols, rows, w, h = max(candidates, key=lambda t: t[0])
            total_tiles = cols * rows
            smart_scale_applied = True
            pil_img = pil_img.resize((w, h), PILImage.Resampling.LANCZOS)
            oc0, or0 = _tiling_grid_dims(orig_w, orig_h, overlap, step)
            tiles_before = oc0 * or0
            logger.info(
                "Smart-scale tiled upscale: optimized input %dx%d -> %dx%d (%s, s=%.4f) "
                "API tiles %d -> %d (was %dx%d grid)",
                orig_w,
                orig_h,
                w,
                h,
                how,
                best_s,
                tiles_before,
                total_tiles,
                oc0,
                or0,
            )

    target_w, target_h = w * factor_int, h * factor_int

    logger.info(
        "Tiled upscale: %dx%d -> %dx%d, grid %dx%d (%d tiles), overlap=%dpx",
        w,
        h,
        target_w,
        target_h,
        cols,
        rows,
        total_tiles,
        overlap,
    )

    overlap_out = overlap * factor_int
    result = np.zeros((target_h, target_w, 3), dtype=np.float32)
    weights = np.zeros((target_h, target_w), dtype=np.float32)

    tile_idx = 0
    for row in range(rows):
        for col in range(cols):
            tile_idx += 1
            x0 = min(col * step, max(0, w - max_tile_src))
            y0 = min(row * step, max(0, h - max_tile_src))
            x1 = min(x0 + max_tile_src, w)
            y1 = min(y0 + max_tile_src, h)

            tile = pil_img.crop((x0, y0, x1, y1))
            logger.info(
                "Tile %d/%d: src (%d,%d)-(%d,%d) = %dx%d",
                tile_idx, total_tiles, x0, y0, x1, y1,
                x1 - x0, y1 - y0,
            )

            if tile_idx > 1:
                time.sleep(0.5)

            upscaled_tile = _call_upscale_api(client, tile, factor_str, project_id)
            tile_arr = np.array(upscaled_tile.convert("RGB"), dtype=np.float32)
            th, tw = tile_arr.shape[:2]

            ox = x0 * factor_int
            oy = y0 * factor_int

            mask = _build_blend_mask(
                tw, th, overlap_out,
                blend_left=col > 0,
                blend_top=row > 0,
            )

            result[oy : oy + th, ox : ox + tw] += tile_arr * mask[:, :, np.newaxis]
            weights[oy : oy + th, ox : ox + tw] += mask

    # Avoid division by zero
    weights = np.maximum(weights, 1e-6)
    result /= weights[:, :, np.newaxis]
    result = np.clip(result, 0, 255).astype(np.uint8)

    out = PILImage.fromarray(result, "RGB")
    if smart_scale_applied:
        out = out.resize(
            (orig_w * factor_int, orig_h * factor_int),
            PILImage.Resampling.LANCZOS,
        )
    return out


def upscale_image(
    pil_img: PILImage.Image,
    factor: Literal["x2", "x4"],
    service_account_json: str,
) -> PILImage.Image:
    """Main entry point: upscale a PIL image, handling tiling if needed."""
    if factor not in VALID_FACTORS:
        raise UpscaleError(f"Ungueltiger Faktor: {factor}. Erlaubt: x2, x4")

    factor_int = VALID_FACTORS[factor]
    w, h = pil_img.size
    target_pixels = (w * factor_int) * (h * factor_int)

    client, project_id = _get_vertex_client(service_account_json)

    if pil_img.mode == "RGBA":
        pil_img = pil_img.convert("RGB")

    if target_pixels <= MAX_OUTPUT_PIXELS:
        return _upscale_single(client, pil_img, factor, project_id)
    else:
        return _upscale_tiled(client, pil_img, factor_int, project_id)
