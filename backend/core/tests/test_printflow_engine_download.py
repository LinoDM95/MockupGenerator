from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from django.test import Client, TestCase, override_settings

from core.printflow_engine_download import PRINTFLOW_ENGINE_EXE_FILENAME


class PrintflowEngineDownloadTests(TestCase):
    def setUp(self) -> None:
        self.client = Client()

    @override_settings(
        PRINTFLOW_ENGINE_DOWNLOAD_URL="https://cdn.example.test/engine/PrintFlowEngine.exe",
    )
    def test_redirects_when_env_url_set(self) -> None:
        r = self.client.get("/api/public/printflow-engine/")
        self.assertEqual(r.status_code, 302)
        self.assertEqual(
            r["Location"],
            "https://cdn.example.test/engine/PrintFlowEngine.exe",
        )

    def test_serves_file_from_static_root_when_present(self) -> None:
        static_root = Path(tempfile.mkdtemp())
        try:
            exe = static_root / PRINTFLOW_ENGINE_EXE_FILENAME
            exe.write_bytes(b"MZ-fake-exe")
            with override_settings(
                PRINTFLOW_ENGINE_DOWNLOAD_URL="",
                STATIC_ROOT=static_root,
            ):
                r = self.client.get("/api/public/printflow-engine/")
            try:
                self.assertEqual(r.status_code, 200)
                self.assertIn("attachment", r.get("Content-Disposition", ""))
                body = b"".join(r.streaming_content)
                self.assertEqual(body, b"MZ-fake-exe")
            finally:
                r.close()
        finally:
            shutil.rmtree(static_root, ignore_errors=True)

    @override_settings(PRINTFLOW_ENGINE_DOWNLOAD_URL="")
    def test_404_when_no_url_and_no_file(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            with override_settings(STATIC_ROOT=Path(td)):
                r = self.client.get("/api/public/printflow-engine/")
        self.assertEqual(r.status_code, 404)
