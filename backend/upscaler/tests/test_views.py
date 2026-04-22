"""Upscaler: API-Views."""

from __future__ import annotations

import os
from io import BytesIO
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image as PILImage

from core.tests.support import api_client_bearer, create_user, minimal_png_bytes


class UpscaleImageViewTests(TestCase):
    def test_400_missing_cloud_engine(self) -> None:
        user = create_user(username="up0", password="pw")
        c = api_client_bearer(user)
        png = minimal_png_bytes()
        r = c.post(
            "/api/upscaler/upscale/",
            data={
                "image": SimpleUploadedFile("i.png", png, content_type="image/png"),
                "factor": "2",
            },
            format="multipart",
        )
        self.assertEqual(r.status_code, 400)

    def test_400_vertex_without_service_account(self) -> None:
        user = create_user(username="up_vertex_no_sa", password="pw")
        c = api_client_bearer(user)
        png = minimal_png_bytes()
        r = c.post(
            "/api/upscaler/upscale/",
            data={
                "image": SimpleUploadedFile("i.png", png, content_type="image/png"),
                "factor": "2",
                "cloud_engine": "vertex",
            },
            format="multipart",
        )
        self.assertEqual(r.status_code, 400)

    def test_503_without_replicate_token(self) -> None:
        with patch.dict(os.environ, {"REPLICATE_API_TOKEN": ""}, clear=False):
            user = create_user(username="up1", password="pw")
            c = api_client_bearer(user)
            png = minimal_png_bytes()
            r = c.post(
                "/api/upscaler/upscale/",
                data={
                    "image": SimpleUploadedFile("i.png", png, content_type="image/png"),
                    "factor": "2",
                    "cloud_engine": "replicate",
                },
                format="multipart",
            )
        self.assertEqual(r.status_code, 503)

    @patch("upscaler.views.upscale_image")
    def test_200_png_response_mocked(self, mock_up: MagicMock) -> None:
        out = PILImage.new("RGB", (4, 4), color=(255, 0, 0))
        mock_up.return_value = out

        buf = BytesIO()
        PILImage.new("RGB", (8, 8), color=(10, 20, 30)).save(buf, format="PNG")
        png = buf.getvalue()

        with patch.dict(
            os.environ, {"REPLICATE_API_TOKEN": "r8_test_token"}, clear=False
        ):
            user = create_user(username="up2", password="pw")
            c = api_client_bearer(user)
            r = c.post(
                "/api/upscaler/upscale/",
                data={
                    "image": SimpleUploadedFile("i.png", png, content_type="image/png"),
                    "factor": "2",
                    "cloud_engine": "replicate",
                },
                format="multipart",
            )
        self.assertEqual(r.status_code, 200, r.content[:500])
        self.assertEqual(r["Content-Type"], "image/png")
        self.assertGreater(len(r.content), 0)
