"""Upscaler: API-Views."""

from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image as PILImage

from ai_integration.models import AIConnection
from core.tests.support import api_client_bearer, create_user, minimal_png_bytes

_MIN_SA = (
    '{"type":"service_account","project_id":"p1",'
    '"private_key":"-----BEGIN RSA PRIVATE KEY-----\\nMIIE\\n-----END RSA PRIVATE KEY-----\\n",'
    '"client_email":"x@p1.iam.gserviceaccount.com"}'
)


class UpscaleImageViewTests(TestCase):
    def test_400_without_vertex_config(self) -> None:
        user = create_user(username="up1", password="pw")
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

    @patch("upscaler.views.upscale_image")
    def test_200_png_response_mocked(self, mock_up: MagicMock) -> None:
        user = create_user(username="up2", password="pw")
        conn, _ = AIConnection.objects.get_or_create(user=user)
        conn.set_service_account_json(_MIN_SA)
        conn.is_active = True
        conn.save()

        out = PILImage.new("RGB", (4, 4), color=(255, 0, 0))
        mock_up.return_value = out

        buf = BytesIO()
        PILImage.new("RGB", (8, 8), color=(10, 20, 30)).save(buf, format="PNG")
        png = buf.getvalue()

        c = api_client_bearer(user)
        r = c.post(
            "/api/upscaler/upscale/",
            data={
                "image": SimpleUploadedFile("i.png", png, content_type="image/png"),
                "factor": "2",
            },
            format="multipart",
        )
        self.assertEqual(r.status_code, 200, r.content[:500])
        self.assertEqual(r["Content-Type"], "image/png")
        self.assertGreater(len(r.content), 0)
