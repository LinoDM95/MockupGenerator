from __future__ import annotations

import gc
import json
import logging
import math
import os
import time
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from urllib.parse import quote
from typing import Any, Tuple

import cv2
import httpx
import numpy as np
from PIL import Image as PILImage
from replicate import Client
from replicate.exceptions import ModelError
from replicate.helpers import FileOutput

from upscaler.limits import MAX_OUTPUT_PIXELS

logger = logging.getLogger(__name__)

_DEFAULT_VERTEX_LOCATION = "us-central1"
# Vertex AI / Prediction API require OAuth scope; bare SA creds alone are rejected.
_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"

# Real-ESRGAN auf Replicate: pro Aufruf Faktor 2 oder 4.
_DEFAULT_REPLICATE_MODEL = "nightmareai/real-esrgan"


class UpscaleError(Exception):
    pass


class UpscaleUserInputError(UpscaleError):
    """Ungueltige Nutzerparameter — HTTP 400."""

    pass


class UpscaleAPIError(UpscaleError):
    """Fehler von Imagen/Vertex, Replicate oder Infrastruktur."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


class VertexAPINotEnabledError(UpscaleError):
    """Vertex AI API (aiplatform) not enabled for the GCP project."""

    def __init__(self, project_id: str) -> None:
        super().__init__("Die Vertex AI API ist nicht aktiviert.")
        self.project_id = project_id


OVERLAP_SRC = 64
TOTAL_UPSCALE_FACTORS: frozenset[int] = frozenset({2, 4, 8, 16})
SMART_SCALE_MIN = 0.85


def native_steps_for_total_factor(total: int) -> list[int]:
    """Zerlegt 2/4/8/16 in native API-Schritte (nur 2 und 4)."""
    if total not in TOTAL_UPSCALE_FACTORS:
        raise UpscaleError(f"Ungueltiger Gesamtfaktor: {total}. Erlaubt: 2, 4, 8, 16.")
    mapping: dict[int, list[int]] = {
        2: [2],
        4: [4],
        8: [4, 2],
        16: [4, 4],
    }
    return mapping[total]


def smallest_cover_factor(required_scale: float) -> int | None:
    """Kleinste Zahl in (2,4,8,16) mit Wert >= required_scale, oder None wenn >16 nötig."""
    for f in (2, 4, 8, 16):
        if f >= required_scale - 1e-12:
            return f
    return None


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
) -> np.ndarray:
    """Float32-Maske (H, W) mit linearem Verlauf in Ueberlappungszonen (vectorisiert, numpy)."""
    mask = np.ones((tile_h, tile_w), dtype=np.float32)
    ow_x = min(overlap_out, tile_w) if blend_left else 0
    ow_y = min(overlap_out, tile_h) if blend_top else 0

    if blend_left and ow_x > 0:
        ramp = np.linspace(0.0, 1.0, ow_x, dtype=np.float32)
        mask[:, :ow_x] *= ramp[np.newaxis, :]

    if blend_top and ow_y > 0:
        ramp = np.linspace(0.0, 1.0, ow_y, dtype=np.float32)
        mask[:ow_y, :] *= ramp[:, np.newaxis]

    return mask


def _decode_image_bytes_to_rgb_f32(png_or_image_bytes: bytes) -> np.ndarray:
    """Dekodiert Kachel-Bytes (PNG) mit OpenCV, BGR(A) -> RGB, float32 [0, 255]."""
    arr = np.frombuffer(png_or_image_bytes, dtype=np.uint8)
    im = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if im is None:
        raise UpscaleAPIError(
            "Kachel-Bild war nicht decodierbar (cv2.imdecode).",
            status_code=503,
        )
    if im.ndim == 2:
        im = cv2.cvtColor(im, cv2.COLOR_GRAY2BGR)
    c = im.shape[2]
    if c == 3:
        rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
    else:
        im = cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA)
        rgb = im[:, :, :3]
    return rgb.astype(np.float32)


def _resize_rgb_f32_lanczos(
    tile_rgb_f32: np.ndarray,
    target_w: int,
    target_h: int,
) -> np.ndarray:
    """LANCZOS4 über uint8, Ausgabe float32 (H, W, 3). width/height in Pixeln (cv2)."""
    t = np.clip(tile_rgb_f32, 0.0, 255.0).astype(np.uint8)
    b = cv2.cvtColor(t, cv2.COLOR_RGB2BGR)
    b2 = cv2.resize(
        b,
        (target_w, target_h),
        interpolation=cv2.INTER_LANCZOS4,
    )
    r = cv2.cvtColor(b2, cv2.COLOR_BGR2RGB)
    return r.astype(np.float32)


def _tiling_fuse_add_weighted(
    acc: np.ndarray,
    wsum: np.ndarray,
    oy: int,
    ox: int,
    tile_rgb_f32: np.ndarray,
    mask_2d: np.ndarray,
) -> None:
    th, tw, _ = tile_rgb_f32.shape
    m3 = mask_2d[:, :, np.newaxis]
    acc[oy : oy + th, ox : ox + tw, :] += tile_rgb_f32 * m3
    wsum[oy : oy + th, ox : ox + tw] += mask_2d


def _tiling_finalize_to_rgb8(acc: np.ndarray, wsum: np.ndarray) -> np.ndarray:
    w = np.maximum(wsum, 1e-6)
    out = acc / w[:, :, np.newaxis]
    return np.clip(out, 0, 255).astype(np.uint8)


def _rgb8_to_rgba_u8(rgb_u8: np.ndarray) -> np.ndarray:
    h, w, _ = rgb_u8.shape
    a = np.full((h, w, 1), 255, dtype=np.uint8)
    return np.concatenate([rgb_u8, a], axis=2)


def _pil_to_rgb8_array(pil: PILImage.Image) -> np.ndarray:
    p = pil if pil.mode == "RGB" else pil.convert("RGB")
    return np.asarray(p, dtype=np.uint8)


def _replicate_file_output_from_run(
    client: Client,
    model_ref: str,
    pil_tile: PILImage.Image,
    factor_int: int,
) -> FileOutput:
    """Replicate `client.run`; liefert ``FileOutput`` — ausserhalb der Worker **kein** ``.read()`` (RAM)."""
    if factor_int not in (2, 4):
        raise UpscaleError(f"Intern: Replicate erwartet Faktor 2 oder 4, nicht {factor_int}.")

    img_byte_arr = BytesIO()
    pil_tile.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    try:
        output = client.run(
            model_ref,
            input={
                "image": img_byte_arr,
                "scale": factor_int,
                "face_enhance": False,
            },
            use_file_output=True,
        )
    except ModelError as exc:
        err = getattr(getattr(exc, "prediction", None), "error", None) or str(exc)
        err_s = str(err) if err is not None else ""
        logger.warning("Replicate ModelError: %s", (err_s or "")[:500])
        lower = err_s.lower()
        if "402" in err_s or "pay" in lower or "credit" in lower or "balance" in lower:
            raise UpscaleAPIError(
                "Replicate: Nicht genug Guthaben auf dem API-Konto. Bitte auf replicate.com "
                "unter Account / Billing aufladen, einige Minuten warten und erneut versuchen.",
                status_code=402,
            ) from exc
        raise UpscaleAPIError(
            f"Upscale fehlgeschlagen: {err_s or 'unbekannter Fehler'}",
            status_code=502,
        ) from exc
    except Exception as exc:  # noqa: BLE001 — nach oben mappen
        msg = str(exc)
        logger.warning("Replicate: %s", (msg or "")[:500])
        um = msg.upper()
        if "401" in msg or "UNAUTHORIZED" in um:
            raise UpscaleAPIError(
                "Replicate API-Token ungueltig oder abgelaufen.",
                status_code=401,
            ) from exc
        if "403" in msg or "PERMISSION" in um:
            raise UpscaleAPIError(
                "Replicate: Zugriff verweigert. Token und Berechtigungen pruefen.",
                status_code=403,
            ) from exc
        if "429" in msg or "RATE" in um:
            raise UpscaleAPIError(
                "Replicate-Rate-Limit. Bitte kurz warten und erneut versuchen.",
                status_code=429,
            ) from exc
        if "402" in msg or "PAYMENT REQUIRED" in um:
            raise UpscaleAPIError(
                "Replicate: Nicht genug Guthaben auf dem API-Konto. Bitte auf replicate.com "
                "unter Account / Billing aufladen, einige Minuten warten und erneut versuchen.",
                status_code=402,
            ) from exc
        if "503" in msg or "UNAVAILABLE" in um:
            raise UpscaleAPIError(
                "Der Upscale-Dienst ist gerade nicht erreichbar. Bitte spaeter erneut versuchen.",
                status_code=503,
            ) from exc
        raise UpscaleAPIError(
            f"Upscale fehlgeschlagen: {msg}",
            status_code=502,
        ) from exc

    if output is None:
        raise UpscaleAPIError("Replicate lieferte kein Ergebnis.", status_code=503)
    if isinstance(output, list):
        if not output:
            raise UpscaleAPIError("Replicate lieferte eine leere Ausgabeliste.", status_code=503)
        first = output[0]
    else:
        first = output
    if not isinstance(first, FileOutput):
        raise UpscaleAPIError(
            f"Unerwartetes Replicate-Output-Format: {type(first).__name__}",
            status_code=503,
        )
    return first


def _replicate_client_run_to_png_bytes(
    client: Client,
    model_ref: str,
    pil_tile: PILImage.Image,
    factor_int: int,
) -> bytes:
    """Laeuft Replicate-Modell, liefert Rohtext-Bytes (PNG) der Ausgabedatei."""
    return _replicate_file_output_from_run(
        client, model_ref, pil_tile, factor_int
    ).read()


_REPLICATE_TILE_MAX_ATTEMPTS = 6
_REPLICATE_TILE_BACKOFF_MAX_SEC = 64.0


def _replicate_client_run_to_file_output_with_retry(
    client: Client,
    model_ref: str,
    pil_tile: PILImage.Image,
    factor_int: int,
) -> FileOutput:
    """Nur `client.run` (API) mit Backoff; ``FileOutput`` noch ohne Download der Bytes."""
    delay = 1.0
    for attempt in range(1, _REPLICATE_TILE_MAX_ATTEMPTS + 1):
        try:
            return _replicate_file_output_from_run(
                client, model_ref, pil_tile, factor_int
            )
        except UpscaleAPIError as e:
            if (
                e.status_code in (429, 500, 502, 503)
                and attempt < _REPLICATE_TILE_MAX_ATTEMPTS
            ):
                logger.warning(
                    "Replicate Kachel-API: Versuch %d/%d, Status %d — Retry in %.1f s (Backoff)",
                    attempt,
                    _REPLICATE_TILE_MAX_ATTEMPTS,
                    e.status_code,
                    delay,
                )
                time.sleep(delay)
                delay = min(delay * 2.0, _REPLICATE_TILE_BACKOFF_MAX_SEC)
                continue
            raise
    raise RuntimeError("replicate file_output API retry: unreachable")


def _replicate_file_output_read_bytes_with_retry(fo: FileOutput) -> bytes:
    """``FileOutput.read()`` (HTTP-GET der Kachel) mit Backoff — sequentiell im Haupthread."""
    delay = 1.0
    for attempt in range(1, _REPLICATE_TILE_MAX_ATTEMPTS + 1):
        try:
            b = fo.read()
            if not b:
                raise UpscaleAPIError("Kachel-Datei war leer.", status_code=503)
            return b
        except UpscaleAPIError as e:
            if (
                e.status_code in (429, 500, 502, 503)
                and attempt < _REPLICATE_TILE_MAX_ATTEMPTS
            ):
                logger.warning(
                    "Kachel-Download: Versuch %d/%d, Status %d — Retry in %.1f s (Backoff)",
                    attempt,
                    _REPLICATE_TILE_MAX_ATTEMPTS,
                    e.status_code,
                    delay,
                )
                time.sleep(delay)
                delay = min(delay * 2.0, _REPLICATE_TILE_BACKOFF_MAX_SEC)
                continue
            raise
        except httpx.HTTPStatusError as e:
            code = e.response.status_code
            if (
                code in (429, 500, 502, 503, 504)
                and attempt < _REPLICATE_TILE_MAX_ATTEMPTS
            ):
                logger.warning(
                    "Kachel-Download HTTP %s: Versuch %d/%d — Retry in %.1f s (Backoff)",
                    code,
                    attempt,
                    _REPLICATE_TILE_MAX_ATTEMPTS,
                    delay,
                )
                time.sleep(delay)
                delay = min(delay * 2.0, _REPLICATE_TILE_BACKOFF_MAX_SEC)
                continue
            raise UpscaleAPIError(
                f"Kachel-Download fehlgeschlagen (HTTP {code}).", status_code=502
            ) from e
        except (httpx.RequestError, OSError) as e:
            if attempt < _REPLICATE_TILE_MAX_ATTEMPTS:
                logger.warning(
                    "Kachel-Download Netzwerk: Versuch %d/%d — %s, Retry in %.1f s",
                    attempt,
                    _REPLICATE_TILE_MAX_ATTEMPTS,
                    e,
                    delay,
                )
                time.sleep(delay)
                delay = min(delay * 2.0, _REPLICATE_TILE_BACKOFF_MAX_SEC)
                continue
            raise UpscaleAPIError(
                f"Kachel-Download: {e}",
                status_code=502,
            ) from e
    raise RuntimeError("replicate kachel read retry: unreachable")


def _replicate_client_run_to_png_bytes_with_retry(
    client: Client,
    model_ref: str,
    pil_tile: PILImage.Image,
    factor_int: int,
) -> bytes:
    """API-Retry, dann Download-Retry (ein Aufrufspiel wie frueher)."""
    fo = _replicate_client_run_to_file_output_with_retry(
        client, model_ref, pil_tile, factor_int
    )
    return _replicate_file_output_read_bytes_with_retry(fo)


def _pil_to_webp_q90_rgb(pil_img: PILImage.Image) -> PILImage.Image:
    """Einmalig WebP Q90, dann RGB-PIL — reduziert Pufferlast ggü. riesigem unkompr. Raster."""
    buf = BytesIO()
    im = pil_img if pil_img.mode == "RGB" else pil_img.convert("RGB")
    im.save(buf, format="WEBP", quality=90, method=6)
    buf.seek(0)
    return PILImage.open(buf).copy()


def _replicate_upscale_tiled(
    client: Client,
    model_ref: str,
    pil_img: PILImage.Image,
    factor_int: int,
) -> PILImage.Image:
    """Gross: Phase 1 parallele Replicate-API, Phase 2 sequentielles Download/Decode/Stitch; WebP Q90 (RGB)."""
    orig_w, orig_h = pil_img.size
    w, h = orig_w, orig_h

    max_tile_px = int(math.isqrt(MAX_OUTPUT_PIXELS))
    max_tile_src = max_tile_px // factor_int

    if max_tile_src < 128:
        raise UpscaleError(
            "Bildaufloesung ist zu hoch fuer den gewaehlten Faktor."
        )

    overlap = min(OVERLAP_SRC, max_tile_src // 4)
    step = max_tile_src - overlap

    cols, rows = _tiling_grid_dims(w, h, overlap, step)
    total_tiles = cols * rows

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

    if total_tiles == 1:
        out = _replicate_upscale_full_single(
            client,
            model_ref,
            pil_img,
            factor_int,
        )
        if smart_scale_applied:
            o = _pil_to_rgb8_array(out)
            b = cv2.cvtColor(o, cv2.COLOR_RGB2BGR)
            b2 = cv2.resize(
                b,
                (orig_w * factor_int, orig_h * factor_int),
                interpolation=cv2.INTER_LANCZOS4,
            )
            o2 = cv2.cvtColor(b2, cv2.COLOR_BGR2RGB)
            pil_res = _pil_to_webp_q90_rgb(PILImage.fromarray(o2, "RGB"))
            del o, b, b2, o2
            gc.collect()
            return pil_res
        return _pil_to_webp_q90_rgb(out)

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
    # Gewichtete Leinwand: in-place in acc/wsum (float32) — kein dupl. Voll-Result
    acc = np.zeros((target_h, target_w, 3), dtype=np.float32)
    wsum = np.zeros((target_h, target_w), dtype=np.float32)

    jobs: list[
        tuple[int, int, int, int, int, int, int, PILImage.Image]
    ] = []
    k0 = 0
    for row in range(rows):
        for col in range(cols):
            k0 += 1
            x0 = min(col * step, max(0, w - max_tile_src))
            y0 = min(row * step, max(0, h - max_tile_src))
            x1 = min(x0 + max_tile_src, w)
            y1 = min(y0 + max_tile_src, h)
            jobs.append(
                (row, col, k0, x0, y0, x1, y1, pil_img.crop((x0, y0, x1, y1)))
            )

    max_workers = min(8, max(1, total_tiles))

    def _replicate_file_output_for_job(
        j: tuple[int, int, int, int, int, int, int, PILImage.Image],
    ) -> FileOutput:
        *_, j_tile = j
        c = _replicate_client()
        return _replicate_client_run_to_file_output_with_retry(
            c, model_ref, j_tile, factor_int
        )

    logger.info(
        "API-Calls gestartet (Parallel) — %d Kacheln, %d Worker; "
        "Stitching (Download/Decode) folgt sequentiell.",
        total_tiles,
        max_workers,
    )
    file_outputs: list[FileOutput] = []
    futs: list[Any] = []
    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futs = [ex.submit(_replicate_file_output_for_job, j) for j in jobs]
        try:
            for fut in futs:
                file_outputs.append(fut.result())
        except BaseException:
            for f in futs:
                f.cancel()
            raise

    for idx, (job, fo) in enumerate(zip(jobs, file_outputs), start=1):
        row, col, _k, x0, y0, x1, y1, _jtile = job
        logger.info(
            "Stitching Kachel %d von %d (Sequentiell) — src (%d,%d)-(%d,%d) = %dx%d",
            idx,
            total_tiles,
            x0,
            y0,
            x1,
            y1,
            x1 - x0,
            y1 - y0,
        )
        try:
            raw_png = _replicate_file_output_read_bytes_with_retry(fo)
        except UpscaleAPIError:
            del fo
            gc.collect()
            raise
        except Exception as exc:
            del fo
            gc.collect()
            raise UpscaleAPIError(
                f"Kachel-Download (Zeile {row}, Spalte {col}): {exc}",
                status_code=502,
            ) from exc
        del fo
        gc.collect()

        try:
            tile_arr = _decode_image_bytes_to_rgb_f32(raw_png)
        except UpscaleAPIError:
            del raw_png
            gc.collect()
            raise
        except Exception as exc:
            del raw_png
            gc.collect()
            raise UpscaleAPIError(
                f"Replicate Kachel-Decode (Zeile {row}, Spalte {col}): {exc}",
                status_code=502,
            ) from exc
        del raw_png
        gc.collect()

        tw_in = x1 - x0
        th_in = y1 - y0
        exp_w, exp_h = tw_in * factor_int, th_in * factor_int
        if tile_arr.shape[1] != exp_w or tile_arr.shape[0] != exp_h:
            tile_arr = _resize_rgb_f32_lanczos(tile_arr, exp_w, exp_h)

        th, tw, _ = tile_arr.shape
        ox = x0 * factor_int
        oy = y0 * factor_int
        mask = _build_blend_mask(
            tw,
            th,
            overlap_out,
            blend_left=col > 0,
            blend_top=row > 0,
        )
        _tiling_fuse_add_weighted(acc, wsum, oy, ox, tile_arr, mask)
        del tile_arr, mask
        gc.collect()

    del file_outputs, jobs, futs
    gc.collect()

    out_u8 = _tiling_finalize_to_rgb8(acc, wsum)
    del acc, wsum
    gc.collect()

    rgba_out = _rgb8_to_rgba_u8(out_u8)
    del out_u8
    gc.collect()
    if smart_scale_applied:
        bgr = cv2.cvtColor(rgba_out, cv2.COLOR_RGBA2BGR)
        bgr2 = cv2.resize(
            bgr,
            (orig_w * factor_int, orig_h * factor_int),
            interpolation=cv2.INTER_LANCZOS4,
        )
        rgba_out = cv2.cvtColor(bgr2, cv2.COLOR_BGR2RGBA)
        del bgr, bgr2
        gc.collect()
    pil_out = PILImage.fromarray(rgba_out, "RGBA").convert("RGB")
    del rgba_out
    gc.collect()
    return _pil_to_webp_q90_rgb(pil_out)




def _get_vertex_client(service_account_json: str) -> Tuple[Any, str, Any]:
    """Create a Vertex AI client from the user's GCP service account JSON (BYOK).

    Returns ``(client, project_id, scoped_credentials)``. Credentials are needed
    to download upscale results that Vertex returns as ``gs://`` URIs only.
    """
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
    return client, project_id, scoped_credentials


def _pil_to_genai_image(pil_img: PILImage.Image):
    """Convert a PIL image to a google-genai Image object."""
    from google.genai import types

    buf = BytesIO()
    fmt = "PNG" if pil_img.mode == "RGBA" else "JPEG"
    pil_img.save(buf, format=fmt, quality=92)
    image_bytes = buf.getvalue()
    return types.Image(image_bytes=image_bytes)


def _download_gcs_object_bytes(gs_uri: str, credentials: Any) -> bytes:
    """Load object bytes from ``gs://bucket/path/to/object`` using OAuth (same SA as Vertex)."""
    import httpx
    from google.auth.transport.requests import Request as GoogleAuthRequest

    if not gs_uri.startswith("gs://"):
        raise UpscaleError("Ungueltige GCS-URI.")
    rest = gs_uri[5:]
    slash = rest.find("/")
    if slash <= 0 or slash >= len(rest) - 1:
        raise UpscaleError("GCS-URI unvollstaendig.")
    bucket_name = rest[:slash]
    blob_name = rest[slash + 1 :]
    encoded = quote(blob_name, safe="")
    url = (
        f"https://storage.googleapis.com/storage/v1/b/{bucket_name}/o/"
        f"{encoded}?alt=media"
    )
    if not credentials.valid:
        credentials.refresh(GoogleAuthRequest())
    headers = {"Authorization": f"Bearer {credentials.token}"}
    resp = httpx.get(url, headers=headers, timeout=120.0)
    if resp.status_code == 403:
        logger.warning("GCS download forbidden: %s", (resp.text or "")[:300])
        raise UpscaleAPIError(
            "Kein Zugriff auf das Upscale-Ergebnis im Cloud-Speicher. "
            "Dem Dienstkonto werden Leserechte auf den Vertex-/Imagen-Bucket benoetigt "
            "(z. B. Rolle „Storage Object Viewer“ auf das Projekt oder den Bucket).",
            status_code=503,
        )
    if resp.status_code != 200:
        logger.warning(
            "GCS download failed: %s body=%s",
            resp.status_code,
            (resp.text or "")[:300],
        )
        raise UpscaleAPIError(
            "Das hochskalierte Bild konnte nicht aus dem Cloud-Speicher geladen werden. "
            "Bitte spaeter erneut versuchen.",
            status_code=503,
        )
    return resp.content


def _types_image_to_pil(image_obj: Any, credentials: Any) -> PILImage.Image:
    """Convert google.genai ``Image`` (inline bytes or GCS URI) to PIL."""
    gcs_uri = getattr(image_obj, "gcs_uri", None)
    raw: bytes | None = None
    if gcs_uri:
        raw = _download_gcs_object_bytes(gcs_uri, credentials)
    else:
        raw = getattr(image_obj, "image_bytes", None)
    if not raw:
        raise UpscaleAPIError(
            "Vertex AI hat keine Bilddaten geliefert (weder Bytes noch GCS-URI). "
            "Bitte spaeter erneut versuchen.",
            status_code=503,
        )
    try:
        return PILImage.open(BytesIO(raw))
    except PILImage.UnidentifiedImageError as exc:
        logger.warning(
            "Upscale response bytes are not a decodable image (len=%s)",
            len(raw),
        )
        raise UpscaleAPIError(
            "Das Upscale-Ergebnis war kein gueltiges Bild. Bitte spaeter erneut versuchen.",
            status_code=503,
        ) from exc


def _generated_image_to_pil(generated: Any, credentials: Any) -> PILImage.Image:
    """Convert first ``GeneratedImage`` from upscale response to PIL."""
    rai = getattr(generated, "rai_filtered_reason", None)
    if rai:
        raise UpscaleAPIError(
            f"Das Bild wurde blockiert: {rai}",
            status_code=400,
        )
    inner = getattr(generated, "image", None)
    if inner is None:
        raise UpscaleAPIError(
            "Upscale-Antwort enthielt kein Bild.",
            status_code=503,
        )
    return _types_image_to_pil(inner, credentials)


def _vertex_upscale_user_message(msg: str) -> str | None:
    """Erkennt typische Google-Vertex-/Imagen-Fehler und liefert eine klare Nutzer-Meldung."""
    um = msg.upper()
    if "INTERNAL" in um and ("STATUS" in um or "ERROR" in um or "500" in msg):
        return (
            "Der Upscale-Dienst von Google (Vertex AI) hat einen internen Fehler gemeldet. "
            "Das ist meist voruebergehend und liegt nicht an deinem Bild oder dieser App — "
            "bitte in einigen Minuten erneut versuchen."
        )
    if "REQUEST FAILED" in um and ("TRY AGAIN" in um or "MINUTES" in um):
        return (
            "Der Upscale-Dienst von Google ist kurz ueberlastet oder nicht erreichbar. "
            "Bitte spaeter erneut versuchen."
        )
    return None


def _call_vertex_upscale_api(
    client,
    pil_tile: PILImage.Image,
    factor_str: str,
    project_id: str,
    credentials: Any,
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
        friendly = _vertex_upscale_user_message(msg)
        if friendly:
            raise UpscaleAPIError(
                friendly,
                status_code=503,
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

    return _generated_image_to_pil(response.generated_images[0], credentials)


def _vertex_upscale_full_single(
    client,
    pil_img: PILImage.Image,
    factor_str: str,
    project_id: str,
    credentials: Any,
) -> PILImage.Image:
    """Upscale the full image in a single API call (output <= 17MP)."""
    logger.info("Single upscale %s with factor %s", pil_img.size, factor_str)
    return _call_vertex_upscale_api(client, pil_img, factor_str, project_id, credentials)


def _vertex_upscale_tiled(
    client,
    pil_img: PILImage.Image,
    factor_int: int,
    project_id: str,
    credentials: Any,
) -> PILImage.Image:
    """Upscale a large image by splitting it into overlapping tiles,
    upscaling each, then blending them back together (OpenCV/numpy)."""
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

    if total_tiles == 1:
        out = _vertex_upscale_full_single(
            client,
            pil_img,
            factor_str,
            project_id,
            credentials,
        )
        if smart_scale_applied:
            o = _pil_to_rgb8_array(out)
            b = cv2.cvtColor(o, cv2.COLOR_RGB2BGR)
            b2 = cv2.resize(
                b,
                (orig_w * factor_int, orig_h * factor_int),
                interpolation=cv2.INTER_LANCZOS4,
            )
            o2 = cv2.cvtColor(b2, cv2.COLOR_BGR2RGB)
            return PILImage.fromarray(o2, "RGB")
        return out

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
    acc = np.zeros((target_h, target_w, 3), dtype=np.float32)
    wsum = np.zeros((target_h, target_w), dtype=np.float32)

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

            upscaled_tile = _call_vertex_upscale_api(
                client, tile, factor_str, project_id, credentials
            )
            tw_in, th_in = tile.size
            exp_w, exp_h = tw_in * factor_int, th_in * factor_int
            rgb_u8 = _pil_to_rgb8_array(upscaled_tile)
            if rgb_u8.shape[1] != exp_w or rgb_u8.shape[0] != exp_h:
                b = cv2.cvtColor(rgb_u8, cv2.COLOR_RGB2BGR)
                b2 = cv2.resize(
                    b, (exp_w, exp_h), interpolation=cv2.INTER_LANCZOS4
                )
                rgb_u8 = cv2.cvtColor(b2, cv2.COLOR_BGR2RGB)
            tile_arr = rgb_u8.astype(np.float32)
            th, tw, _ = tile_arr.shape

            ox = x0 * factor_int
            oy = y0 * factor_int

            mask = _build_blend_mask(
                tw, th, overlap_out,
                blend_left=col > 0,
                blend_top=row > 0,
            )
            _tiling_fuse_add_weighted(acc, wsum, oy, ox, tile_arr, mask)

    out_u8 = _tiling_finalize_to_rgb8(acc, wsum)
    rgba_out = _rgb8_to_rgba_u8(out_u8)
    if smart_scale_applied:
        bgr = cv2.cvtColor(rgba_out, cv2.COLOR_RGBA2BGR)
        bgr2 = cv2.resize(
            bgr,
            (orig_w * factor_int, orig_h * factor_int),
            interpolation=cv2.INTER_LANCZOS4,
        )
        rgba_out = cv2.cvtColor(bgr2, cv2.COLOR_BGR2RGBA)
    return PILImage.fromarray(rgba_out, "RGBA").convert("RGB")


def _vertex_upscale_one_native_pass(
    client,
    pil_img: PILImage.Image,
    native_int: int,
    project_id: str,
    credentials: Any,
) -> PILImage.Image:
    """Ein Vertex-Upscale-Schritt mit nativem Faktor 2 oder 4 (inkl. Tiling).

    Immer die Kachel-Pipeline nutzen: bei langen/wilden Seitenverhältnissen kann
    trotz moderater Gesamt-Fläche ein Gitter nötig sein. ``total_tiles==1`` ist
    dann ein schneller Einzelaufruf (gleiche Logik wie lokal/PrintFlow Engine).
    """
    if native_int not in (2, 4):
        raise UpscaleError(f"Intern: nativer Faktor muss 2 oder 4 sein, nicht {native_int}.")
    if pil_img.mode == "RGBA":
        pil_img = pil_img.convert("RGB")
    return _vertex_upscale_tiled(client, pil_img, native_int, project_id, credentials)


def _upscale_image_vertex(
    pil_img: PILImage.Image,
    service_account_json: str,
    *,
    factor_total: int | None = None,
    target_width: int | None = None,
    target_height: int | None = None,
) -> PILImage.Image:
    """Upscale: entweder ``factor_total`` in (2,4,8,16) oder exakte Zielgröße.

    8/16 werden als Kette aus 2x-/4x-Schritten ausgeführt. Bei Zielauflösung: KI bis
    zum deckenden Faktor, danach LANCZOS auf exakte Pixel.
    """
    has_target = target_width is not None and target_height is not None
    has_factor = factor_total is not None

    if has_target == has_factor:
        raise UpscaleError(
            "Genau einer der Modi ist erforderlich: factor_total ODER target_width+target_height."
        )

    if pil_img.mode == "RGBA":
        pil_img = pil_img.convert("RGB")

    if has_target:
        tw, th = int(target_width), int(target_height)
        ow, oh = pil_img.size
        if ow < 1 or oh < 1:
            raise UpscaleError("Ungueltige Bildgroesse.")
        required = max(tw / float(ow), th / float(oh))
        if required <= 1.0:
            return pil_img.resize((tw, th), PILImage.Resampling.LANCZOS)

        cover = smallest_cover_factor(required)
        if cover is None:
            raise UpscaleUserInputError(
                "Die gewuenschte Zielaufloesung erfordert mehr als 16x Upscaling. "
                "Bitte kleinere Zielwerte waehlen."
            )

        client, project_id, credentials = _get_vertex_client(service_account_json)
        img: PILImage.Image = pil_img
        for step in native_steps_for_total_factor(cover):
            img = _vertex_upscale_one_native_pass(
                client, img, step, project_id, credentials
            )
        if img.size != (tw, th):
            img = img.resize((tw, th), PILImage.Resampling.LANCZOS)
        return img

    assert factor_total is not None
    if factor_total not in TOTAL_UPSCALE_FACTORS:
        raise UpscaleError(f"Ungueltiger Faktor: {factor_total}. Erlaubt: 2, 4, 8, 16.")

    client, project_id, credentials = _get_vertex_client(service_account_json)
    img = pil_img
    for step in native_steps_for_total_factor(factor_total):
        img = _vertex_upscale_one_native_pass(client, img, step, project_id, credentials)
    return img


def _replicate_model_ref() -> str:
    raw = (os.environ.get("REPLICATE_UPSCALE_MODEL") or "").strip()
    return raw or _DEFAULT_REPLICATE_MODEL


def _replicate_client() -> Client:
    token = (os.environ.get("REPLICATE_API_TOKEN") or "").strip()
    if not token:
        raise UpscaleAPIError(
            "Upscale ist nicht konfiguriert: REPLICATE_API_TOKEN fehlt in der "
            "Server-Umgebung (.env).",
            status_code=503,
        )
    return Client(api_token=token)


def _replicate_png_bytes_to_pil(raw: bytes) -> PILImage.Image:
    try:
        return PILImage.open(BytesIO(raw))
    except PILImage.UnidentifiedImageError as exc:
        logger.warning(
            "Replicate-Bytes sind kein decodierbares Bild (len=%s)",
            len(raw),
        )
        raise UpscaleAPIError(
            "Das Upscale-Ergebnis war kein gueltiges Bild. Bitte spaeter erneut versuchen.",
            status_code=503,
        ) from exc


def _call_replicate_api(
    client: Client,
    model_ref: str,
    pil_tile: PILImage.Image,
    factor_int: int,
) -> PILImage.Image:
    """Einen Replicate Real-ESRGAN-Lauf; factor_int 2 oder 4 (PNG -> PIL)."""
    raw = _replicate_client_run_to_png_bytes(client, model_ref, pil_tile, factor_int)
    return _replicate_png_bytes_to_pil(raw)


def _replicate_upscale_full_single(
    client: Client,
    model_ref: str,
    pil_img: PILImage.Image,
    factor_int: int,
) -> PILImage.Image:
    """Bild in einem Replicate-Aufruf (Ausgabe <= MAX_OUTPUT_PIXELS-Logik in _replicate_upscale_tiled)."""
    logger.info("Single upscale %s with factor %s", pil_img.size, factor_int)
    return _call_replicate_api(client, model_ref, pil_img, factor_int)


def _replicate_upscale_one_native_pass(
    client: Client,
    model_ref: str,
    pil_img: PILImage.Image,
    native_int: int,
) -> PILImage.Image:
    """Ein Replicate-Upscale-Schritt mit nativem Faktor 2 oder 4 (inkl. Tiling).

    Immer dieselbe Kachel-Pipeline wie Vertex und PrintFlow: Gitter aus
    ``max_tile_src``/Overlap; kein reiner Flächentest, damit z. B. Panorama-Streifen
    korrekt in Kacheln laufen. Bei genau einer Kachel: intern ein Einzel-API-Call.
    """
    if native_int not in (2, 4):
        raise UpscaleError(f"Intern: nativer Faktor muss 2 oder 4 sein, nicht {native_int}.")
    if pil_img.mode == "RGBA":
        pil_img = pil_img.convert("RGB")
    return _replicate_upscale_tiled(client, model_ref, pil_img, native_int)


def _upscale_image_replicate(
    pil_img: PILImage.Image,
    *,
    factor_total: int | None = None,
    target_width: int | None = None,
    target_height: int | None = None,
) -> PILImage.Image:
    """Upscale: entweder ``factor_total`` in (2,4,8,16) oder exakte Zielgröße.

    8/16 laufen als Kette aus 2x-/4x-Real-ESRGAN. Bei Zielauflösung: bis zum
    deckenden Faktor, danach LANCZOS.
    """
    has_target = target_width is not None and target_height is not None
    has_factor = factor_total is not None

    if has_target == has_factor:
        raise UpscaleError(
            "Genau einer der Modi ist erforderlich: factor_total ODER target_width+target_height."
        )

    if pil_img.mode == "RGBA":
        pil_img = pil_img.convert("RGB")

    client = _replicate_client()
    model_ref = _replicate_model_ref()

    if has_target:
        tw, th = int(target_width), int(target_height)
        ow, oh = pil_img.size
        if ow < 1 or oh < 1:
            raise UpscaleError("Ungueltige Bildgroesse.")
        required = max(tw / float(ow), th / float(oh))
        if required <= 1.0:
            return pil_img.resize((tw, th), PILImage.Resampling.LANCZOS)

        cover = smallest_cover_factor(required)
        if cover is None:
            raise UpscaleUserInputError(
                "Die gewuenschte Zielaufloesung erfordert mehr als 16x Upscaling. "
                "Bitte kleinere Zielwerte waehlen."
            )

        img: PILImage.Image = pil_img
        for step in native_steps_for_total_factor(cover):
            img = _replicate_upscale_one_native_pass(client, model_ref, img, step)
        if img.size != (tw, th):
            img = img.resize((tw, th), PILImage.Resampling.LANCZOS)
        return img

    assert factor_total is not None
    if factor_total not in TOTAL_UPSCALE_FACTORS:
        raise UpscaleError(f"Ungueltiger Faktor: {factor_total}. Erlaubt: 2, 4, 8, 16.")

    img = pil_img
    for step in native_steps_for_total_factor(factor_total):
        img = _replicate_upscale_one_native_pass(client, model_ref, img, step)
    return img


def upscale_image(
    pil_img: PILImage.Image,
    service_account_json: str = "",
    *,
    cloud_engine: str,
    factor_total: int | None = None,
    target_width: int | None = None,
    target_height: int | None = None,
) -> PILImage.Image:
    """Cloud-Upscale: explizit ``vertex`` (BYOK) oder ``replicate`` (Server-Token)."""
    ce = (cloud_engine or "").strip().lower()
    if ce == "vertex":
        sa = (service_account_json or "").strip()
        if not sa:
            raise UpscaleUserInputError(
                "Vertex: Kein Dienstkonto. Bitte unter KI-Integration die "
                "Vertex-Service-Account-.json hinterlegen."
            )
        return _upscale_image_vertex(
            pil_img,
            sa,
            factor_total=factor_total,
            target_width=target_width,
            target_height=target_height,
        )
    if ce == "replicate":
        if not (os.environ.get("REPLICATE_API_TOKEN") or "").strip():
            raise UpscaleAPIError(
                "Replicate: REPLICATE_API_TOKEN fehlt in der Server-Konfiguration.",
                status_code=503,
            )
        return _upscale_image_replicate(
            pil_img,
            factor_total=factor_total,
            target_width=target_width,
            target_height=target_height,
        )
    raise UpscaleUserInputError(
        "cloud_engine muss 'vertex' oder 'replicate' sein."
    )
