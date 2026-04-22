"""
Build PrintFlow Engine als PrintFlowEngine.exe (Windows, PyInstaller).

Requirements:
  pip install -r companion_app/requirements.txt

Run from repository root:
  python companion_app/build_exe.py

Output:
  dist/PrintFlowEngine.exe  (single file, no console window)

After a successful build, the EXE is copied to
  frontend/frontend/public/PrintFlowEngine.exe
so Vite can serve it for the Upscaler download link (no broken HTML downloads).

The executable starts the FastAPI server on 127.0.0.1:8001 (not 8000 — Django) and shows a tray icon
(pystray). Tray: optional "Mit Windows starten" (HKCU Run) and "Beenden" to quit.

Notes:
  - Models downloaded via POST /install-model are extracted next to the .exe.
  - Override CORS or model URL at runtime via environment variables (see main.py).
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
# Direktaufruf `python companion_app/build_exe.py`: Script-Dir wäre sonst allein auf sys.path[0].
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
COMPANION = Path(__file__).resolve().parent
MAIN = COMPANION / "main.py"
CATALOG = COMPANION / "model_catalog.json"
ENGINE_VER = COMPANION / "ENGINE_VERSION"

PYINSTALLER_NAME = "PrintFlowEngine"
EXE_FILENAME = f"{PYINSTALLER_NAME}.exe"


def main() -> int:
    if not MAIN.is_file():
        print(f"Missing entry script: {MAIN}", file=sys.stderr)
        return 1

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        str(MAIN),
        "--name",
        PYINSTALLER_NAME,
        "--onefile",
        "--noconsole",
        "--clean",
        f"--paths={REPO_ROOT}",
        "--hidden-import=companion_app.local_services",
        "--hidden-import=companion_app.paths",
        "--hidden-import=companion_app.model_store",
        "--hidden-import=companion_app.upscale_limits",
        "--hidden-import=companion_app.icon_assets",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan",
        "--hidden-import=uvicorn.lifespan.on",
        "--hidden-import=anyio._backends._asyncio",
        "--collect-submodules=uvicorn",
        "--collect-submodules=anyio",
        "--collect-submodules=multipart",
        "--collect-submodules=pystray",
    ]

    if CATALOG.is_file():
        cmd.extend(["--add-data", f"{CATALOG};companion_app"])
    else:
        print("Warning: model_catalog.json missing; catalog will be empty in onefile build.", file=sys.stderr)

    if ENGINE_VER.is_file():
        cmd.extend(["--add-data", f"{ENGINE_VER};companion_app"])
    else:
        print(
            "Warning: ENGINE_VERSION missing; bundled app may report 0.0.0.",
            file=sys.stderr,
        )

    # Windows: eigenes PrintFlow-Icon (Explorer, Taskleiste) statt PyInstaller-Standard.
    if sys.platform == "win32":
        from companion_app.icon_assets import write_exe_icon

        with tempfile.TemporaryDirectory(prefix="printflow-engine-ico-") as td:
            ico_path = Path(td) / "PrintFlowEngine.ico"
            write_exe_icon(ico_path)
            cmd.extend(["--icon", str(ico_path)])
            print("Running:", " ".join(cmd))
            rc = subprocess.call(cmd, cwd=REPO_ROOT)
    else:
        print("Running:", " ".join(cmd))
        rc = subprocess.call(cmd, cwd=REPO_ROOT)
    if rc == 0:
        src = REPO_ROOT / "dist" / EXE_FILENAME
        dest_dir = REPO_ROOT / "frontend" / "frontend" / "public"
        dest = dest_dir / EXE_FILENAME
        if src.is_file():
            dest_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            print(f"Copied to {dest} (Vite static / {EXE_FILENAME}).")
        else:
            print(
                f"Warning: dist/{EXE_FILENAME} not found; skip public/ copy.",
                file=sys.stderr,
            )
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
