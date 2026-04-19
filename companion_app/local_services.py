"""Local upscale with tiling — adapted from backend/upscaler/services.py (Vertex replaced by subprocess)."""

from __future__ import annotations

import logging
import math
import os
import subprocess
import time
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from typing import Any, Literal

from PIL import Image as PILImage

from companion_app.paths import companion_dir
from companion_app import tile_progress
from companion_app.upscale_limits import MAX_OUTPUT_PIXELS

logger = logging.getLogger(__name__)
OVERLAP_SRC = 64
VALID_FACTORS: dict[str, int] = {"x2": 2, "x4": 4}
TOTAL_UPSCALE_FACTORS: frozenset[int] = frozenset({2, 4, 8, 16})
SMART_SCALE_MIN = 0.85
# Upper bound for parallel tile subprocesses (VRAM on typical 8–16 GB GPUs).
MAX_TILE_WORKERS_CAP = 2

class UpscaleError(Exception):
    pass


class UpscaleUserInputError(UpscaleError):
    """Ungueltige Nutzerparameter — HTTP 400."""

    pass


def native_steps_for_total_factor(total: int) -> list[int]:
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
    for f in (2, 4, 8, 16):
        if f >= required_scale - 1e-12:
            return f
    return None


def _realesrgan_working_dir() -> Path:
    """Arbeitsverzeichnis fuer ncnn: hier liegt models/ (Modell-.bin/.param)."""
    return companion_dir()


def _real_esrgan_exe_path() -> Path:
    """
    Suche: REALESRGAN_NCNN_VULKAN_EXE, dann companion_app/, dann Projektroot.
    (Install legt die EXE per model_store nach companion_dir ab.)
    """
    env = (os.environ.get("REALESRGAN_NCNN_VULKAN_EXE") or "").strip()
    if env:
        p = Path(env).expanduser()
        if p.is_file():
            return p.resolve()
    cdir = companion_dir()
    exe_name = "realesrgan-ncnn-vulkan.exe"
    cand = cdir / exe_name
    if cand.is_file():
        return cand.resolve()
    repo_root = Path(__file__).resolve().parent.parent
    root_exe = repo_root / exe_name
    if root_exe.is_file():
        return root_exe.resolve()
    return (cdir / exe_name).resolve()


def _realesrgan_exe_not_found_detail() -> str:
    cdir = companion_dir()
    repo = Path(__file__).resolve().parent.parent
    lines = [
        str(cdir / "realesrgan-ncnn-vulkan.exe"),
        str(repo / "realesrgan-ncnn-vulkan.exe"),
    ]
    return " / ".join(lines)


def _scale_arg(factor_str: str) -> str:
    if factor_str == "x2":
        return "2"
    if factor_str == "x4":
        return "4"
    raise UpscaleError(f"Ungueltiger Faktor: {factor_str}")


def _local_upscale_tile(
    pil_tile: PILImage.Image,
    factor_str: str,
    ncnn_model_name: str,
) -> PILImage.Image:
    """Run a single tile through realesrgan-ncnn-vulkan via subprocess."""
    exe = _real_esrgan_exe_path()
    if not exe.is_file():
        raise UpscaleError(
            "realesrgan-ncnn-vulkan.exe wurde nicht gefunden. "
            f"Geprueft: {_realesrgan_exe_not_found_detail()}. "
            "Nach Modell-Installation aus dem Katalog sollte die EXE unter companion_app/ liegen "
            "(oder EXE ins Projektroot legen). Optional: Umgebungsvariable REALESRGAN_NCNN_VULKAN_EXE. "
            "Companion-App neu starten, danach im Upscaler erneut „Installieren“."
        )

    if pil_tile.mode != "RGB":
        pil_tile = pil_tile.convert("RGB")

    with tempfile.TemporaryDirectory() as tmp:
        in_path = Path(tmp) / "in.png"
        out_path = Path(tmp) / "out.png"
        pil_tile.save(in_path, format="PNG")
        scale = _scale_arg(factor_str)
        cmd = [
            str(exe),
            "-i",
            str(in_path),
            "-o",
            str(out_path),
            "-n",
            ncnn_model_name,
            "-s",
            scale,
        ]
        try:
            subprocess.run(
                cmd,
                check=True,
                cwd=str(_realesrgan_working_dir()),
                timeout=600,
            )
        except subprocess.CalledProcessError as exc:
            raise UpscaleError(
                f"Real-ESRGAN ist fehlgeschlagen (Exit {exc.returncode})."
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise UpscaleError("Real-ESRGAN Timeout beim Kachel-Upscale.") from exc

        if not out_path.is_file():
            raise UpscaleError("Real-ESRGAN hat keine Ausgabedatei erzeugt.")

        return PILImage.open(out_path).copy()


def _upscale_single_local(
    pil_img: PILImage.Image,
    factor_str: str,
    ncnn_model_name: str,
    *,
    progress_job_id: str | None = None,
) -> PILImage.Image:
    logger.info(
        "Single local upscale %s with factor %s model %s",
        pil_img.size,
        factor_str,
        ncnn_model_name,
    )
    if progress_job_id:
        tile_progress.reset_job(progress_job_id, 1, 1)
        tile_progress.tile_start(progress_job_id)
    t0 = time.perf_counter()
    try:
        return _local_upscale_tile(pil_img, factor_str, ncnn_model_name)
    finally:
        if progress_job_id:
            tile_progress.tile_done(
                progress_job_id,
                (time.perf_counter() - t0) * 1000.0,
            )


def _tiling_grid_dims(w: int, h: int, overlap: int, step: int) -> tuple[int, int]:
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
    import numpy as np

    mask = np.ones((tile_h, tile_w), dtype=np.float32)
    # Bei schmalen/hohen Randkacheln overlap_out > tile_w|tile_h — sonst bricht das
    # Broadcasting (mask * ramp) oder erzeugt falsche Gewichte → „Kachelgitter“-Artefakte.
    ow_x = min(overlap_out, tile_w) if blend_left else 0
    ow_y = min(overlap_out, tile_h) if blend_top else 0

    if blend_left and ow_x > 0:
        ramp = np.linspace(0.0, 1.0, ow_x, dtype=np.float32)
        mask[:, :ow_x] *= ramp[np.newaxis, :]

    if blend_top and ow_y > 0:
        ramp = np.linspace(0.0, 1.0, ow_y, dtype=np.float32)
        mask[:ow_y, :] *= ramp[:, np.newaxis]

    return mask


def _tile_job_result(
    row: int,
    col: int,
    x0: int,
    y0: int,
    pil_tile: PILImage.Image,
    factor_str: str,
    ncnn_model_name: str,
    factor_int: int,
    progress_job_id: str | None = None,
) -> tuple[int, int, int, int, PILImage.Image]:
    if progress_job_id:
        tile_progress.tile_start(progress_job_id)
    t0 = time.perf_counter()
    try:
        upscaled = _local_upscale_tile(pil_tile, factor_str, ncnn_model_name)
        tw_in, th_in = pil_tile.size
        exp_w, exp_h = tw_in * factor_int, th_in * factor_int
        if upscaled.size != (exp_w, exp_h):
            upscaled = upscaled.resize(
                (exp_w, exp_h),
                PILImage.Resampling.LANCZOS,
            )
        return row, col, x0, y0, upscaled
    finally:
        if progress_job_id:
            tile_progress.tile_done(
                progress_job_id,
                (time.perf_counter() - t0) * 1000.0,
            )


def _upscale_tiled_local(
    pil_img: PILImage.Image,
    factor_int: int,
    ncnn_model_name: str,
    *,
    max_tile_workers: int = 1,
    progress_job_id: str | None = None,
) -> PILImage.Image:
    try:
        import numpy as np
    except ModuleNotFoundError as exc:
        raise UpscaleError(
            "Fuer grosse Bilder (Tiling) wird NumPy benoetigt. "
            "Bitte installieren: pip install numpy"
        ) from exc

    factor_str = f"x{factor_int}"
    orig_w, orig_h = pil_img.size
    w, h = orig_w, orig_h

    max_tile_px = int(math.isqrt(MAX_OUTPUT_PIXELS))
    max_tile_src = max_tile_px // factor_int

    if max_tile_src < 128:
        raise UpscaleError("Bildaufloesung ist zu hoch fuer den gewaehlten Faktor.")

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
                "Smart-scale tiled local upscale: optimized input %dx%d -> %dx%d (%s, s=%.4f) "
                "tiles %d -> %d (was %dx%d grid)",
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
        out = _upscale_single_local(
            pil_img,
            factor_str,
            ncnn_model_name,
            progress_job_id=progress_job_id,
        )
        if smart_scale_applied:
            out = out.resize(
                (orig_w * factor_int, orig_h * factor_int),
                PILImage.Resampling.LANCZOS,
            )
        return out

    logger.info(
        "Tiled local upscale: %dx%d -> %dx%d, grid %dx%d (%d tiles), overlap=%dpx",
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

    workers = max(
        1,
        min(max_tile_workers, MAX_TILE_WORKERS_CAP, total_tiles),
    )

    if progress_job_id:
        tile_progress.reset_job(progress_job_id, total_tiles, workers)

    jobs: list[tuple[int, int, int, int, int, int, PILImage.Image]] = []
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
                tile_idx,
                total_tiles,
                x0,
                y0,
                x1,
                y1,
                x1 - x0,
                y1 - y0,
            )
            jobs.append((row, col, x0, y0, x1, y1, tile))

    tile_results: list[tuple[int, int, int, int, PILImage.Image]] = []
    if workers <= 1:
        for row, col, x0, y0, _x1, _y1, tile in jobs:
            tr = _tile_job_result(
                row,
                col,
                x0,
                y0,
                tile,
                factor_str,
                ncnn_model_name,
                factor_int,
                progress_job_id,
            )
            tile_results.append(tr)
    else:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_job = {
                executor.submit(
                    _tile_job_result,
                    row,
                    col,
                    x0,
                    y0,
                    tile,
                    factor_str,
                    ncnn_model_name,
                    factor_int,
                    progress_job_id,
                ): (row, col)
                for row, col, x0, y0, _x1, _y1, tile in jobs
            }
            for fut in as_completed(future_to_job):
                tile_results.append(fut.result())
        tile_results.sort(key=lambda t: (t[0], t[1]))

    for row, col, x0, y0, upscaled_tile in tile_results:
        tile_arr = np.array(upscaled_tile.convert("RGB"), dtype=np.float32)
        th, tw = tile_arr.shape[:2]

        ox = x0 * factor_int
        oy = y0 * factor_int

        mask = _build_blend_mask(
            tw,
            th,
            overlap_out,
            blend_left=col > 0,
            blend_top=row > 0,
        )

        result[oy : oy + th, ox : ox + tw] += tile_arr * mask[:, :, np.newaxis]
        weights[oy : oy + th, ox : ox + tw] += mask

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


def _upscale_one_native_pass_local(
    pil_img: PILImage.Image,
    native_int: int,
    ncnn_model_name: str,
    *,
    max_tile_workers: int = 1,
    progress_job_id: str | None = None,
) -> PILImage.Image:
    """Ein Real-ESRGAN-Schritt mit nativem Faktor 2 oder 4."""
    if native_int not in (2, 4):
        raise UpscaleError(f"Intern: nativer Faktor muss 2 oder 4 sein, nicht {native_int}.")
    factor_str: Literal["x2", "x4"] = "x2" if native_int == 2 else "x4"
    w, h = pil_img.size
    factor_int = native_int
    target_pixels = (w * factor_int) * (h * factor_int)
    if pil_img.mode == "RGBA":
        pil_img = pil_img.convert("RGB")
    w_cap = max(1, min(max_tile_workers, MAX_TILE_WORKERS_CAP))
    if target_pixels <= MAX_OUTPUT_PIXELS:
        return _upscale_single_local(
            pil_img,
            factor_str,
            ncnn_model_name,
            progress_job_id=progress_job_id,
        )
    return _upscale_tiled_local(
        pil_img,
        factor_int,
        ncnn_model_name,
        max_tile_workers=w_cap,
        progress_job_id=progress_job_id,
    )


def upscale_image_local(
    pil_img: PILImage.Image,
    ncnn_model_name: str,
    *,
    max_tile_workers: int = 1,
    progress_job_id: str | None = None,
    factor_total: int | None = None,
    target_width: int | None = None,
    target_height: int | None = None,
) -> PILImage.Image:
    """Lokales Upscale: factor_total in (2,4,8,16) oder exakte Zielgroesse."""
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
                "Die gewuenschte Zielaufloesung erfordert mehr als 16x Upscaling."
            )

        steps = native_steps_for_total_factor(cover)
        img: PILImage.Image = pil_img
        for i, step in enumerate(steps):
            pid = progress_job_id if i == len(steps) - 1 else None
            img = _upscale_one_native_pass_local(
                img,
                step,
                ncnn_model_name,
                max_tile_workers=max_tile_workers,
                progress_job_id=pid,
            )
        if img.size != (tw, th):
            img = img.resize((tw, th), PILImage.Resampling.LANCZOS)
        return img

    assert factor_total is not None
    if factor_total not in TOTAL_UPSCALE_FACTORS:
        raise UpscaleError(f"Ungueltiger Faktor: {factor_total}. Erlaubt: 2, 4, 8, 16.")

    steps = native_steps_for_total_factor(factor_total)
    img = pil_img
    for i, step in enumerate(steps):
        pid = progress_job_id if i == len(steps) - 1 else None
        img = _upscale_one_native_pass_local(
            img,
            step,
            ncnn_model_name,
            max_tile_workers=max_tile_workers,
            progress_job_id=pid,
        )
    return img
