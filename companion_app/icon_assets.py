"""
PrintFlow-Mark für Tray (pystray) und Windows-EXE (.ico), optisch abgestimmt auf
`frontend/frontend/public/favicon.svg` (Indigo-Violett-Verlauf, weißes Symbol).
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

# SVG: linearGradient #6366f1 → #7c3aed
_C1 = (99, 102, 241)
_C2 = (124, 58, 237)
# polygon points im viewBox 0..24
_POLY_24 = (
    (13, 2),
    (3, 14),
    (12, 14),
    (11, 22),
    (21, 10),
    (12, 10),
)


def draw_printflow_mark(size: int, *, supersample: int = 1) -> Image.Image:
    """
    RGBA, Kanten weich bei supersample>1 (Rendering in höherer Auflösung, dann LANCZOS).
    """
    ss = max(1, int(supersample))
    w = max(4, int(size) * ss)

    grad = Image.new("RGB", (w, w))
    px = grad.load()
    denom = max(w - 1, 1) * 2
    for y in range(w):
        for x in range(w):
            t = (x + y) / denom if denom else 0.0
            px[x, y] = (
                int(_C1[0] + (_C2[0] - _C1[0]) * t),
                int(_C1[1] + (_C2[1] - _C1[1]) * t),
                int(_C1[2] + (_C2[2] - _C1[2]) * t),
            )

    mask = Image.new("L", (w, w), 0)
    md = ImageDraw.Draw(mask)
    r = max(1, int(round(6 * w / 24)))
    md.rounded_rectangle((0, 0, w - 1, w - 1), radius=r, fill=255)

    out = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)

    scale = w / 24.0
    pts = [
        (int(round(x * scale)), int(round(y * scale))) for x, y in _POLY_24
    ]
    ImageDraw.Draw(out).polygon(pts, fill=(255, 255, 255, 255))

    target = max(4, int(size))
    if w != target:
        out = out.resize((target, target), Image.Resampling.LANCZOS)
    return out


def tray_icon_pil_image() -> Image.Image:
    """Icon für die Windows-Taskleiste (Infobereich): scharf, Branding wie die Web-App."""
    return draw_printflow_mark(64, supersample=2)


def write_exe_icon(path: Path) -> None:
    """Mehrstufiges ICO für PyInstaller (`--icon`), Windows Explorer & Dialoge."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    sizes = (256, 128, 64, 48, 32, 24, 16)
    imgs: list[Image.Image] = []
    for s in sizes:
        ss = 2 if s < 48 else 1
        imgs.append(draw_printflow_mark(s, supersample=ss))
    imgs[0].save(path, format="ICO", append_images=imgs[1:])
