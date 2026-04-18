"""Model catalog, install dirs, active model — companion_dir only."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import httpx

from companion_app.paths import companion_dir

logger = logging.getLogger(__name__)

_ACTIVE_FILE = ".active_model.json"


def _catalog_file_path() -> Path:
    if getattr(sys, "frozen", False):
        meipass = Path(getattr(sys, "_MEIPASS", Path.cwd()))
        bundled = meipass / "companion_app" / "model_catalog.json"
        if bundled.is_file():
            return bundled
    return Path(__file__).resolve().parent / "model_catalog.json"


def load_catalog() -> dict[str, Any]:
    path = _catalog_file_path()
    if not path.is_file():
        return {"version": 1, "models": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_catalog_models() -> list[dict[str, Any]]:
    data = load_catalog()
    models = data.get("models")
    return models if isinstance(models, list) else []


def get_catalog_entry(model_id: str) -> dict[str, Any] | None:
    for m in get_catalog_models():
        if isinstance(m, dict) and m.get("id") == model_id:
            return m
    return None


def models_root() -> Path:
    return companion_dir() / "models"


def model_install_dir(model_id: str) -> Path:
    return models_root() / model_id


def active_model_file() -> Path:
    return companion_dir() / _ACTIVE_FILE


def _flat_ncnn_installed(ncnn_name: str) -> bool:
    """
    realesrgan-ncnn-vulkan erwartet Dateien direkt unter models/
    (z. B. models/realesrgan-x4plus.bin), nicht models/realesrgan-x4plus/*.
    """
    root = models_root()
    if ncnn_name == "realesrgan-x4plus":
        return (root / "realesrgan-x4plus.bin").is_file() and (
            root / "realesrgan-x4plus.param"
        ).is_file()
    if ncnn_name == "realesrnet-x4plus":
        return (root / "realesrnet-x4plus.bin").is_file() and (
            root / "realesrnet-x4plus.param"
        ).is_file()
    if ncnn_name == "realesrgan-x4plus-anime":
        return (root / "realesrgan-x4plus-anime.bin").is_file() and (
            root / "realesrgan-x4plus-anime.param"
        ).is_file()
    if ncnn_name == "realesr-animevideov3":
        return (root / "realesr-animevideov3-x4.bin").is_file() and (
            root / "realesr-animevideov3-x4.param"
        ).is_file()
    return False


def _zip_basename_matches_ncnn(ncnn_name: str, basename: str) -> bool:
    """Auswahl der Dateien aus offizieller realesrgan-ncnn-vulkan-*-windows.zip (flach unter models/)."""
    if not basename.endswith((".bin", ".param")):
        return False
    if ncnn_name == "realesrgan-x4plus":
        return basename in ("realesrgan-x4plus.bin", "realesrgan-x4plus.param")
    if ncnn_name == "realesr-animevideov3":
        return basename.startswith("realesr-animevideov3-")
    return basename.startswith(f"{ncnn_name}.") or basename.startswith(f"{ncnn_name}-")


def is_model_installed(model_id: str) -> bool:
    ncnn = get_ncnn_model_name(model_id)
    if not ncnn:
        return False
    if _flat_ncnn_installed(ncnn):
        return True
    # Legacy: frueher pro model_id Unterordner
    d = model_install_dir(model_id)
    if d.is_dir():
        if (d / ".installed").is_file():
            return True
        for p in d.rglob("*"):
            if p.is_file():
                return True
    return False


def list_installed_model_ids() -> list[str]:
    out: list[str] = []
    for m in get_catalog_models():
        mid = m.get("id") if isinstance(m, dict) else None
        if isinstance(mid, str) and is_model_installed(mid):
            out.append(mid)
    return out


def get_active_model_id() -> str | None:
    p = active_model_file()
    if not p.is_file():
        return None
    try:
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
        mid = data.get("model_id")
        return mid if isinstance(mid, str) else None
    except (OSError, json.JSONDecodeError):
        return None


def set_active_model_id(model_id: str | None) -> None:
    root = companion_dir()
    root.mkdir(parents=True, exist_ok=True)
    p = active_model_file()
    if not model_id:
        if p.is_file():
            p.unlink()
        return
    if not is_model_installed(model_id):
        raise ValueError(f"Modell nicht installiert: {model_id}")
    with open(p, "w", encoding="utf-8") as f:
        json.dump({"model_id": model_id}, f)


def get_ncnn_model_name(model_id: str) -> str | None:
    entry = get_catalog_entry(model_id)
    if not entry:
        return None
    n = entry.get("ncnn_model_name")
    return n if isinstance(n, str) and n.strip() else None


def resolve_ncnn_name_for_upscale(requested_model_id: str | None) -> str:
    """Pick ncnn -n name: explicit request, else active, else error."""
    mid = (requested_model_id or "").strip() or None
    if not mid:
        mid = get_active_model_id()
    if not mid:
        raise ValueError(
            "Kein Modell gewaehlt. Bitte unter Local Engine ein Modell installieren und aktiv setzen."
        )
    if not is_model_installed(mid):
        raise ValueError(f"Modell nicht installiert: {mid}")
    ncnn = get_ncnn_model_name(mid)
    if not ncnn:
        raise ValueError(f"Katalog-Eintrag fuer {mid} ungueltig (ncnn_model_name).")
    return ncnn


def safe_extract_zip(zip_path: Path, dest: Path) -> None:
    """Extract ZIP to dest with Zip-slip protection."""
    dest = dest.resolve()
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            if member.is_dir():
                continue
            rel = Path(member.filename)
            if rel.is_absolute() or ".." in rel.parts:
                raise ValueError(f"Unsicherer Zip-Eintrag: {member.filename}")
            target = (dest / rel).resolve()
            try:
                target.relative_to(dest)
            except ValueError as exc:
                raise ValueError(f"Zip slip: {member.filename}") from exc
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member, "r") as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out)


def extract_ncnn_model_from_zip(zip_path: Path, dest: Path, ncnn_model_name: str) -> None:
    """
    1) Verschachtelt: models/<ncnn>/datei (aelttere Layouts).
    2) Flach (Real-ESRGAN v0.2.5 ncnn Windows-ZIP): models/<name>.param|.bin direkt
       unter models/ — Ziel ist das gemeinsame models/-Verzeichnis (dest).
    3) Sonst: komplettes Mini-ZIP nach dest.
    """
    dest = dest.resolve()
    dest.mkdir(parents=True, exist_ok=True)
    needle = f"models/{ncnn_model_name}/"

    with zipfile.ZipFile(zip_path, "r") as zf:
        names = [n.replace("\\", "/") for n in zf.namelist()]
        has_any_models = any(
            "models/" in n for n in names if n and not n.endswith("/")
        )

        # --- 1) Unterordner models/<name>/
        extracted = 0
        for member in zf.infolist():
            if member.is_dir():
                continue
            filename = member.filename.replace("\\", "/")
            if needle not in filename:
                continue
            inner = filename.split(needle, 1)[1]
            rel = Path(inner)
            if rel.name == "" or ".." in rel.parts:
                raise ValueError(f"Unsicherer Zip-Eintrag: {member.filename}")
            target = (dest / rel).resolve()
            try:
                target.relative_to(dest)
            except ValueError as exc:
                raise ValueError(f"Zip slip: {member.filename}") from exc
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member, "r") as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out)
            extracted += 1
        if extracted > 0:
            return

        # --- 2) Flach: models/realesrgan-x4plus.bin usw.
        for member in zf.infolist():
            if member.is_dir():
                continue
            filename = member.filename.replace("\\", "/")
            if ".." in filename:
                raise ValueError(f"Unsicherer Zip-Eintrag: {member.filename}")
            parts = filename.split("/")
            if len(parts) < 2 or parts[-2] != "models":
                continue
            basename = parts[-1]
            if not _zip_basename_matches_ncnn(ncnn_model_name, basename):
                continue
            target = (dest / basename).resolve()
            try:
                target.relative_to(dest)
            except ValueError as exc:
                raise ValueError(f"Zip slip: {member.filename}") from exc
            dest.mkdir(parents=True, exist_ok=True)
            with zf.open(member, "r") as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out)
            extracted += 1
        if extracted > 0:
            return

    if has_any_models:
        raise ValueError(
            f"Im ZIP wurden keine passenden Modell-Dateien fuer {ncnn_model_name!r} gefunden."
        )
    safe_extract_zip(zip_path, dest)


def extract_vulkan_runtime_from_zip(zip_path: Path, dest: Path) -> None:
    """
    Offizielle realesrgan-ncnn-vulkan-*-windows.zip enthaelt neben models/ auch
    realesrgan-ncnn-vulkan.exe und vcomp140*.dll (Root oder Unterordner).
    """
    dest = dest.resolve()
    dest.mkdir(parents=True, exist_ok=True)
    optional_dlls = ("vcomp140.dll", "vcomp140d.dll")
    found_exe = False
    with zipfile.ZipFile(zip_path, "r") as zf:
        for want in ("realesrgan-ncnn-vulkan.exe", *optional_dlls):
            for member in zf.infolist():
                if member.is_dir():
                    continue
                fn = member.filename.replace("\\", "/")
                if ".." in fn:
                    raise ValueError(f"Unsicherer Zip-Eintrag: {member.filename}")
                if fn.rsplit("/", 1)[-1].lower() != want.lower():
                    continue
                target = (dest / want).resolve()
                try:
                    target.relative_to(dest)
                except ValueError as exc:
                    raise ValueError(f"Zip slip: {member.filename}") from exc
                with zf.open(member, "r") as src, open(target, "wb") as out:
                    shutil.copyfileobj(src, out)
                if want.endswith(".exe"):
                    found_exe = True
                break
    if not found_exe:
        raise ValueError(
            "Im ZIP wurde realesrgan-ncnn-vulkan.exe nicht gefunden — "
            "bitte offizielles realesrgan-ncnn-vulkan Windows-Paket verwenden."
        )


def write_installed_marker(model_id: str) -> None:
    models_root().mkdir(parents=True, exist_ok=True)
    p = models_root() / f".installed_{model_id}"
    p.write_text("ok", encoding="utf-8")


async def install_model_from_catalog(model_id: str) -> None:
    """Download catalog URL; ncnn-Dateien nach models/ (flach), wie realesrgan-ncnn-vulkan."""
    entry = get_catalog_entry(model_id)
    if not entry:
        raise ValueError(f"Unbekanntes Modell: {model_id}")
    url = entry.get("download_url")
    if not isinstance(url, str) or not url.startswith(("http://", "https://")):
        raise ValueError("Ungueltige oder fehlende download_url im Katalog.")
    ncnn_name = get_ncnn_model_name(model_id)
    if not ncnn_name:
        raise ValueError("Katalog: ncnn_model_name fehlt.")

    dest = models_root()
    dest.mkdir(parents=True, exist_ok=True)

    fd, tmp_name = tempfile.mkstemp(suffix=".zip")
    os.close(fd)
    tmp_path = Path(tmp_name)
    try:
        timeout = httpx.Timeout(600.0, connect=30.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            async with client.stream("GET", url) as resp:
                try:
                    resp.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    raise ValueError(
                        f"Download fehlgeschlagen (HTTP {exc.response.status_code})"
                    ) from exc
                with open(tmp_path, "wb") as out:
                    async for chunk in resp.aiter_bytes():
                        await asyncio.to_thread(out.write, chunk)

        try:
            extract_ncnn_model_from_zip(tmp_path, dest, ncnn_name)
            # Aeltere Modell-ZIPs (z. B. RealESRGAN-ncnn-vulkan-20210725) enthalten aeltere
            # realesrgan-ncnn-vulkan.exe — vorhandenes Runtime aus v0.2.5+ nicht ueberschreiben.
            if not vulkan_runtime_installed():
                extract_vulkan_runtime_from_zip(tmp_path, companion_dir())
        except (ValueError, zipfile.BadZipFile, OSError) as exc:
            raise ValueError(f"Entpacken fehlgeschlagen: {exc}") from exc

        write_installed_marker(model_id)
        if get_active_model_id() is None:
            set_active_model_id(model_id)
    except httpx.HTTPError as exc:
        raise ValueError(f"Download fehlgeschlagen (Netzwerk): {exc}") from exc
    finally:
        tmp_path.unlink(missing_ok=True)


def vulkan_runtime_installed() -> bool:
    """realesrgan-ncnn-vulkan.exe liegt im Companion-Ordner (neben models/)."""
    return (companion_dir() / "realesrgan-ncnn-vulkan.exe").is_file()


def _remove_flat_model_files(ncnn_name: str) -> None:
    root = models_root()
    if not root.is_dir():
        return
    if ncnn_name == "realesrgan-x4plus":
        for name in ("realesrgan-x4plus.bin", "realesrgan-x4plus.param"):
            (root / name).unlink(missing_ok=True)
    elif ncnn_name == "realesrnet-x4plus":
        for name in ("realesrnet-x4plus.bin", "realesrnet-x4plus.param"):
            (root / name).unlink(missing_ok=True)
    elif ncnn_name == "realesrgan-x4plus-anime":
        for name in ("realesrgan-x4plus-anime.bin", "realesrgan-x4plus-anime.param"):
            (root / name).unlink(missing_ok=True)
    elif ncnn_name == "realesr-animevideov3":
        for p in root.glob("realesr-animevideov3-*"):
            if p.is_file() and p.suffix in (".bin", ".param"):
                p.unlink(missing_ok=True)
    else:
        for p in root.iterdir():
            if not p.is_file():
                continue
            if p.name.startswith(f"{ncnn_name}.") or p.name.startswith(
                f"{ncnn_name}-",
            ):
                if p.suffix in (".bin", ".param"):
                    p.unlink(missing_ok=True)


def uninstall_model(model_id: str) -> None:
    """Modell-Dateien unter models/ entfernen, Marke loeschen, aktives Modell ggf. umstellen."""
    if not is_model_installed(model_id):
        raise ValueError(f"Modell ist nicht installiert: {model_id}")
    ncnn = get_ncnn_model_name(model_id)
    if not ncnn:
        raise ValueError("Katalog: ncnn_model_name fehlt.")

    was_active = get_active_model_id() == model_id

    _remove_flat_model_files(ncnn)
    legacy = model_install_dir(model_id)
    if legacy.is_dir():
        shutil.rmtree(legacy, ignore_errors=True)
    (models_root() / f".installed_{model_id}").unlink(missing_ok=True)

    if was_active:
        replacement: str | None = None
        for m in get_catalog_models():
            mid = m.get("id") if isinstance(m, dict) else None
            if not isinstance(mid, str) or mid == model_id:
                continue
            if is_model_installed(mid):
                replacement = mid
                break
        set_active_model_id(replacement)


def uninstall_vulkan_runtime_files() -> None:
    """Entfernt realesrgan-ncnn-vulkan.exe und vcomp*.dll aus companion_dir()."""
    cdir = companion_dir()
    for name in ("realesrgan-ncnn-vulkan.exe", "vcomp140.dll", "vcomp140d.dll"):
        (cdir / name).unlink(missing_ok=True)
