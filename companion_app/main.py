"""
PrintFlow Engine — lokaler Dienst. Start:

  uvicorn companion_app.main:app --host 127.0.0.1 --port 8001

Port 8001 avoids clashing with Django (runserver on 8000). Override: COMPANION_PORT env.

(from repository root). Frozen build: PrintFlowEngine.exe (siehe build_exe.py).
"""

from __future__ import annotations

import asyncio
import logging
import os
import subprocess
import sys
import threading
from io import BytesIO
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image as PILImage
from pydantic import BaseModel

# PyInstaller onefile: Uvicorn/FastAPI ziehen Submodules erst beim Serverstart — ohne diese
# Zeilen fehlen sie oft im Bundle und der Thread in _run_uvicorn stirbt sofort (Tray bleibt).
# AnyIO 4: Backend heißt anyio._backends._asyncio (nicht mehr anyio.backends.asyncio).
import anyio._backends._asyncio  # noqa: F401
import uvicorn.loops.auto  # noqa: F401
import uvicorn.protocols.http.auto  # noqa: F401
import uvicorn.protocols.websockets.auto  # noqa: F401
import uvicorn.lifespan.on  # noqa: F401
from email.message import Message as _EmailMessageForPyInstaller  # noqa: F401

from companion_app import model_store, tile_progress
from companion_app.local_services import (
    UpscaleError,
    UpscaleUserInputError,
    upscale_image_local,
)
from companion_app.upscale_limits import get_max_output_pixels
from companion_app.paths import companion_dir
from companion_app.version_info import engine_version_string

logger = logging.getLogger(__name__)

# Gleiche Quelle wie Frontend: companion_app/ENGINE_VERSION (eine Zeile).
CURRENT_VERSION = engine_version_string()

# Django uses 8000 — Companion must use another port so /status hits FastAPI, not Django.
COMPANION_PORT = int(os.environ.get("COMPANION_PORT", "8001"))

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024
TOTAL_UPSCALE_FACTORS = frozenset({2, 4, 8, 16})
MAX_TARGET_SIDE = 16384
VALID_PARALLEL_TILES = frozenset({"1", "2", "auto"})
_EXE_NAME = "PrintFlowEngine.exe"
_NEW_EXE_NAME = "PrintFlowEngine_new.exe"


def _update_allowed_hosts() -> set[str]:
    out = {"localhost", "127.0.0.1"}
    extra = os.environ.get("COMPANION_UPDATE_ALLOWED_HOSTS", "").strip()
    if extra:
        out |= {h.strip().lower() for h in extra.split(",") if h.strip()}
    return out


def _validate_update_download_url(raw: str) -> str:
    """Mitigiert SSRF: nur erlaubte Hosts, Pfad endet auf PrintFlowEngine.exe."""
    url = (raw or "").strip()
    if not url:
        raise ValueError("download_url ist leer.")

    parsed = urlparse(url)
    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        raise ValueError("Nur http/https-URLs erlaubt.")

    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError("Ungueltiger Host.")

    if host not in _update_allowed_hosts():
        raise ValueError(
            "Host fuer App-Update nicht erlaubt. "
            "COMPANION_UPDATE_ALLOWED_HOSTS setzen oder localhost verwenden.",
        )

    if scheme == "http" and host not in ("localhost", "127.0.0.1"):
        raise ValueError("HTTP nur fuer localhost/127.0.0.1 erlaubt.")

    path = (parsed.path or "").replace("\\", "/")
    if not path.rstrip("/").lower().endswith(_EXE_NAME.lower()):
        raise ValueError(
            f"Pfad muss auf {_EXE_NAME} enden.",
        )

    if parsed.username or parsed.password:
        raise ValueError("URLs mit Zugangsdaten sind nicht erlaubt.")

    return url


def _max_tile_workers_from_parallel(parallel_tiles: str) -> int:
    pt = parallel_tiles.strip().lower()
    if pt not in VALID_PARALLEL_TILES:
        raise ValueError(
            f"parallel_tiles muss '1', '2' oder 'auto' sein, nicht '{parallel_tiles}'.",
        )
    if pt == "1":
        return 1
    return 2


def _parse_factor_total(raw: str | None) -> int | None:
    if raw is None:
        return None
    s = str(raw).strip().lower()
    if not s:
        return None
    if s.startswith("x"):
        s = s[1:]
    try:
        v = int(s, 10)
    except ValueError:
        return None
    return v if v in TOTAL_UPSCALE_FACTORS else None


def _parse_positive_int_form(raw: str | None) -> int | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    try:
        v = int(s, 10)
    except ValueError:
        return None
    return v if v >= 1 else None


# Browsers treat localhost and 127.0.0.1 as different origins — list both.
# Django liefert die gebaute SPA oft auf :8000 (Vite-Dev nutzt :5173 + /__companion-Proxy).
# Override via env: comma-separated extra origins (COMPANION_CORS_ORIGINS), z. B. weitere Staging-URLs.
_DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://mockupgenerator-aixo.onrender.com",
]


def _cors_origins() -> list[str]:
    extra = os.environ.get("COMPANION_CORS_ORIGINS", "").strip()
    out = list(_DEFAULT_CORS_ORIGINS)
    if extra:
        out.extend(o.strip() for o in extra.split(",") if o.strip())
    return out


app = FastAPI(title="PrintFlow Engine", version=CURRENT_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    # Chrome: https-Seite (Render) → http://127.0.0.1:8001 (Private Network Access / „loopback“).
    allow_private_network=True,
    expose_headers=[
        "X-Original-Width",
        "X-Original-Height",
        "X-Upscaled-Width",
        "X-Upscaled-Height",
    ],
)


@app.get("/status")
def companion_status():
    return {
        "status": "online",
        "version": CURRENT_VERSION,
        "installed_model_ids": model_store.list_installed_model_ids(),
        "active_model_id": model_store.get_active_model_id(),
        "vulkan_runtime_installed": model_store.vulkan_runtime_installed(),
    }


@app.get("/models/catalog")
def get_models_catalog():
    return model_store.load_catalog()


@app.get("/models/installed")
def get_models_installed():
    return {
        "installed_model_ids": model_store.list_installed_model_ids(),
        "active_model_id": model_store.get_active_model_id(),
        "vulkan_runtime_installed": model_store.vulkan_runtime_installed(),
    }


class InstallModelBody(BaseModel):
    model_id: str


@app.post("/install-model")
async def post_install_model(body: InstallModelBody):
    mid = body.model_id.strip()
    if not mid:
        raise HTTPException(status_code=400, detail="model_id ist leer.")
    try:
        await model_store.install_model_from_catalog(mid)
    except ValueError as exc:
        logger.warning("Install model failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        logger.exception("Install model I/O")
        raise HTTPException(
            status_code=500,
            detail=f"Speicher fehlgeschlagen: {exc}",
        ) from exc
    return {"ok": True, "model_id": mid}


@app.post("/uninstall-model")
def post_uninstall_model(body: InstallModelBody):
    mid = body.model_id.strip()
    if not mid:
        raise HTTPException(status_code=400, detail="model_id ist leer.")
    try:
        model_store.uninstall_model(mid)
    except ValueError as exc:
        logger.warning("Uninstall model failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        logger.exception("Uninstall model I/O")
        raise HTTPException(
            status_code=500,
            detail=f"Loeschen fehlgeschlagen: {exc}",
        ) from exc
    return {"ok": True, "model_id": mid}


@app.post("/uninstall-vulkan-runtime")
def post_uninstall_vulkan_runtime():
    """Entfernt realesrgan-ncnn-vulkan.exe und vcomp*.dll (Modell-.bin/.param bleiben unter models/)."""
    try:
        model_store.uninstall_vulkan_runtime_files()
    except OSError as exc:
        logger.exception("Uninstall vulkan runtime")
        raise HTTPException(
            status_code=500,
            detail=f"Loeschen fehlgeschlagen: {exc}",
        ) from exc
    return {"ok": True}


class SetActiveBody(BaseModel):
    model_id: str


class UpdateBody(BaseModel):
    download_url: str


@app.post("/models/active")
def post_models_active(body: SetActiveBody):
    mid = body.model_id.strip()
    if not mid:
        raise HTTPException(status_code=400, detail="model_id ist leer.")
    try:
        model_store.set_active_model_id(mid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "active_model_id": mid}


@app.post("/update")
async def post_update(body: UpdateBody):
    try:
        url = _validate_update_download_url(body.download_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    cdir = companion_dir()
    dest = cdir / _NEW_EXE_NAME
    try:
        async with httpx.AsyncClient(timeout=600.0, follow_redirects=False) as client:
            response = await client.get(url)
            response.raise_for_status()
            dest.write_bytes(response.content)
    except httpx.HTTPError as exc:
        logger.exception("Update download failed")
        raise HTTPException(
            status_code=502,
            detail=f"Download fehlgeschlagen: {exc}",
        ) from exc
    except OSError as exc:
        logger.exception("Update write failed")
        raise HTTPException(
            status_code=500,
            detail=f"Speichern fehlgeschlagen: {exc}",
        ) from exc

    bat_path = cdir / "updater.bat"
    bat_exact = (
        "@echo off\r\n"
        "timeout /t 2 /nobreak\r\n"
        "move /y PrintFlowEngine_new.exe PrintFlowEngine.exe\r\n"
        'start "" PrintFlowEngine.exe\r\n'
        'del "%~f0"\r\n'
    )
    try:
        bat_path.write_text(bat_exact, encoding="utf-8-sig")
    except OSError as exc:
        logger.exception("Updater batch write failed")
        raise HTTPException(
            status_code=500,
            detail=f"updater.bat konnte nicht geschrieben werden: {exc}",
        ) from exc

    creationflags = 0
    if sys.platform == "win32":
        creationflags |= getattr(subprocess, "DETACHED_PROCESS", 0)
        creationflags |= getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        subprocess.Popen(
            "updater.bat",
            cwd=str(cdir),
            shell=True,
            close_fds=True,
            creationflags=creationflags,
        )
    except OSError as exc:
        logger.exception("Updater start failed")
        raise HTTPException(
            status_code=500,
            detail=f"Updater konnte nicht gestartet werden: {exc}",
        ) from exc

    logger.info("Update applied; exiting for batch replace.")
    os._exit(0)


@app.get("/tile-progress/{job_id}")
def get_tile_progress(job_id: str):
    """
    Polling fuer Kachel-Fortschritt (job_id vom Client, z. B. UUID).
    Vor reset_job: ready=false; danach: total_tiles, completed_tiles, tile_durations_ms.
    """
    if not tile_progress.is_valid_job_id(job_id):
        raise HTTPException(status_code=400, detail="Ungueltige job_id.")
    snap = tile_progress.get_snapshot(job_id)
    if snap is None:
        return {"ready": False, "finished": False}
    return {"ready": True, **snap}


@app.post("/upscale")
async def upscale(
    image: UploadFile = File(...),
    factor: str | None = Form(None),
    target_width: str | None = Form(None),
    target_height: str | None = Form(None),
    model_id: str | None = Form(None),
    parallel_tiles: str = Form("1"),
    progress_job_id: str | None = Form(None),
):
    tw = _parse_positive_int_form(target_width)
    th = _parse_positive_int_form(target_height)
    factor_total = _parse_factor_total(factor)
    has_target = tw is not None and th is not None
    has_partial_target = (tw is None) != (th is None)
    has_factor = factor_total is not None

    if has_partial_target:
        raise HTTPException(
            status_code=400,
            detail=(
                "Fuer Zielaufloesung muessen sowohl target_width als auch target_height gesetzt sein."
            ),
        )
    if has_target and has_factor:
        raise HTTPException(
            status_code=400,
            detail="Bitte entweder Faktor ODER Zielaufloesung angeben, nicht beides.",
        )
    if not has_target and not has_factor:
        raise HTTPException(
            status_code=400,
            detail=(
                "Bitte 'factor' (2, 4, 8 oder 16) oder 'target_width' und 'target_height' angeben."
            ),
        )
    if has_factor and factor_total is None:
        raise HTTPException(
            status_code=400,
            detail="Ungueltiger Faktor. Erlaubt: 2, 4, 8 oder 16 (z. B. factor=8 oder x8).",
        )

    max_px_cap = min(get_max_output_pixels(), 67_108_864)
    if has_target:
        assert tw is not None and th is not None
        if tw > MAX_TARGET_SIDE or th > MAX_TARGET_SIDE:
            raise HTTPException(
                status_code=400,
                detail=f"Zielabmessungen zu gross (max {MAX_TARGET_SIDE} px pro Kante).",
            )
        if tw * th > max_px_cap:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Zielflaeche (Breite x Hoehe) ueberschreitet das erlaubte Maximum. "
                    "Bitte kleinere Werte waehlen."
                ),
            )

    mid = (model_id or "").strip() or None

    try:
        max_tile_workers = _max_tile_workers_from_parallel(parallel_tiles)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    name = image.filename or ""
    ext = os.path.splitext(name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Dateityp '{ext}' nicht erlaubt. Erlaubt: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    raw = await image.read()
    if len(raw) > MAX_IMAGE_SIZE:
        mb = MAX_IMAGE_SIZE // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Bild zu gross (max {mb} MB).")

    try:
        pil_img = PILImage.open(BytesIO(raw))
        pil_img.load()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Die Datei konnte nicht als Bild gelesen werden.",
        ) from None

    orig_w, orig_h = pil_img.size

    try:
        ncnn = model_store.resolve_ncnn_name_for_upscale(mid)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    pjid = (progress_job_id or "").strip()
    if pjid and not tile_progress.is_valid_job_id(pjid):
        raise HTTPException(
            status_code=400,
            detail="progress_job_id ungueltig (8–128 Zeichen: Buchstaben, Zahlen, _ und -).",
        )

    try:
        if has_target:
            assert tw is not None and th is not None
            result_img = await asyncio.to_thread(
                upscale_image_local,
                pil_img,
                ncnn,
                max_tile_workers=max_tile_workers,
                progress_job_id=pjid or None,
                target_width=tw,
                target_height=th,
            )
        else:
            assert factor_total is not None
            result_img = await asyncio.to_thread(
                upscale_image_local,
                pil_img,
                ncnn,
                max_tile_workers=max_tile_workers,
                progress_job_id=pjid or None,
                factor_total=factor_total,
            )
    except UpscaleUserInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except UpscaleError as exc:
        logger.error("Local upscale error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected local upscale error")
        raise HTTPException(
            status_code=500,
            detail=f"Unerwarteter Fehler: {exc}",
        ) from exc
    finally:
        if pjid:
            tile_progress.finish_job(pjid)

    up_w, up_h = result_img.size
    buf = BytesIO()
    result_img.save(buf, format="PNG", optimize=True)
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={
            "X-Original-Width": str(orig_w),
            "X-Original-Height": str(orig_h),
            "X-Upscaled-Width": str(up_w),
            "X-Upscaled-Height": str(up_h),
            "Content-Disposition": f'inline; filename="upscaled_{up_w}x{up_h}.png"',
            "Access-Control-Expose-Headers": (
                "X-Original-Width, X-Original-Height, X-Upscaled-Width, X-Upscaled-Height"
            ),
        },
    )


# Windows: gebaute EXE bei Anmeldung starten (Tray-Umschalter).
_AUTOSTART_RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
_AUTOSTART_VALUE_NAME = "PrintFlowLocalEngine"


def _windows_frozen_autostart_supported() -> bool:
    return bool(getattr(sys, "frozen", False)) and sys.platform == "win32"


def _autostart_exe_path_norm() -> str:
    return os.path.normcase(os.path.normpath(os.path.abspath(sys.executable)))


def _registry_autostart_command() -> str:
    exe = _autostart_exe_path_norm()
    if " " in exe:
        return f'"{exe}"'
    return exe


def _parse_registry_autostart_value(raw: str) -> str:
    s = (raw or "").strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        s = s[1:-1]
    return os.path.normcase(os.path.normpath(os.path.abspath(s)))


def _windows_autostart_is_enabled() -> bool:
    if not _windows_frozen_autostart_supported():
        return False
    import winreg

    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            _AUTOSTART_RUN_KEY,
            0,
            winreg.KEY_READ,
        ) as key:
            raw, _ = winreg.QueryValueEx(key, _AUTOSTART_VALUE_NAME)
    except FileNotFoundError:
        return False
    except OSError:
        return False
    try:
        reg_path = _parse_registry_autostart_value(str(raw))
    except OSError:
        return False
    return reg_path == _autostart_exe_path_norm()


def _windows_autostart_set(enabled: bool) -> None:
    if not _windows_frozen_autostart_supported():
        raise OSError("Autostart nur unter Windows (gebaute EXE).")
    import winreg

    access = winreg.KEY_READ | winreg.KEY_WRITE
    with winreg.OpenKey(
        winreg.HKEY_CURRENT_USER,
        _AUTOSTART_RUN_KEY,
        0,
        access,
    ) as key:
        if enabled:
            winreg.SetValueEx(
                key,
                _AUTOSTART_VALUE_NAME,
                0,
                winreg.REG_SZ,
                _registry_autostart_command(),
            )
        else:
            try:
                winreg.DeleteValue(key, _AUTOSTART_VALUE_NAME)
            except FileNotFoundError:
                pass


def _ensure_stdio_for_frozen_gui() -> None:
    """
    PyInstaller --noconsole (Windows subsystem): sys.stdin/out/err können None sein.
    Uvicorns Logging-Formatter ruft stream.isatty() auf → ohne echte Streams bricht der Start ab.
    """
    if not getattr(sys, "frozen", False):
        return
    devnull = os.devnull
    try:
        if sys.stdin is None:
            sys.stdin = open(devnull, "r", encoding="utf-8", errors="replace")
        if sys.stdout is None:
            sys.stdout = open(devnull, "w", encoding="utf-8", errors="replace")
        if sys.stderr is None:
            sys.stderr = open(devnull, "w", encoding="utf-8", errors="replace")
    except OSError:
        pass


def _run_uvicorn() -> None:
    import traceback

    import uvicorn

    try:
        logger.info(
            "PrintFlow Engine HTTP: http://127.0.0.1:%s",
            COMPANION_PORT,
        )
        uvicorn.run(app, host="127.0.0.1", port=COMPANION_PORT, log_level="info")
    except Exception:
        logger.exception("PrintFlow Engine HTTP server failed to start or crashed")
        if getattr(sys, "frozen", False):
            log_path = companion_dir() / "companion_server.log"
            try:
                log_path.write_text(traceback.format_exc(), encoding="utf-8")
            except OSError:
                pass
            err_txt = companion_dir() / "companion_start_error.txt"
            try:
                err_txt.write_text(
                    "Der HTTP-Server konnte nicht starten. Siehe companion_server.log "
                    "neben der PrintFlow Engine (PrintFlowEngine.exe).\n",
                    encoding="utf-8",
                )
            except OSError:
                pass
        raise


def _run_with_tray() -> None:
    import pystray
    from pystray import Menu, MenuItem

    from companion_app.icon_assets import tray_icon_pil_image

    t = threading.Thread(target=_run_uvicorn, daemon=True)
    t.start()

    image = tray_icon_pil_image()

    def on_quit(icon: pystray.Icon, _item: object) -> None:
        icon.stop()
        os._exit(0)

    def on_toggle_autostart(icon: pystray.Icon, _item: object) -> None:
        if not _windows_frozen_autostart_supported():
            return
        try:
            _windows_autostart_set(not _windows_autostart_is_enabled())
        except OSError as exc:
            logger.warning("Autostart konnte nicht gesetzt werden: %s", exc)
        icon.update_menu()

    menu_entries: list[object] = []
    if _windows_frozen_autostart_supported():
        menu_entries.append(
            MenuItem(
                "Mit Windows starten",
                on_toggle_autostart,
                checked=lambda _item: _windows_autostart_is_enabled(),
            ),
        )
        menu_entries.append(Menu.SEPARATOR)
    menu_entries.append(MenuItem("Beenden", on_quit))

    icon = pystray.Icon(
        "printflow_engine",
        image,
        "PrintFlow Engine",
        menu=Menu(*menu_entries),
    )
    icon.run()


if __name__ == "__main__":
    if getattr(sys, "frozen", False):
        _ensure_stdio_for_frozen_gui()
        _run_with_tray()
    else:
        import uvicorn

        uvicorn.run(app, host="127.0.0.1", port=COMPANION_PORT)
