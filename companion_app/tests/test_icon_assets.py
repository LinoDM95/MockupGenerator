"""Run from repository root: python -m unittest companion_app.tests.test_icon_assets -v"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from companion_app.icon_assets import (
    draw_printflow_mark,
    tray_icon_pil_image,
    write_exe_icon,
)


class IconAssetsTests(unittest.TestCase):
    def test_draw_sizes_rgba(self) -> None:
        for s in (16, 64, 256):
            im = draw_printflow_mark(s)
            self.assertEqual(im.size, (s, s))
            self.assertEqual(im.mode, "RGBA")

    def test_tray_icon_dimensions(self) -> None:
        im = tray_icon_pil_image()
        self.assertEqual(im.size, (64, 64))
        self.assertEqual(im.mode, "RGBA")

    def test_write_ico(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "app.ico"
            write_exe_icon(p)
            self.assertTrue(p.is_file())
            self.assertGreater(p.stat().st_size, 200)


if __name__ == "__main__":
    unittest.main()
