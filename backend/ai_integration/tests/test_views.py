"""KI-Integration: Status, Connect, Vertex-PATCH, Disconnect, Generate (mock)."""

from __future__ import annotations

import json

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from ai_integration.models import AIConnection
from core.tests.support import api_client_bearer, create_user, minimal_png_bytes

_MIN_SA = (
    '{"type":"service_account","project_id":"p1",'
    '"private_key":"-----BEGIN RSA PRIVATE KEY-----\\nMIIE\\n-----END RSA PRIVATE KEY-----\\n",'
    '"client_email":"x@p1.iam.gserviceaccount.com"}'
)


class AIStatusTests(TestCase):
    def test_status_default_without_connection(self) -> None:
        user = create_user(username="ai1", password="pw")
        c = api_client_bearer(user)
        r = c.get("/api/ai/status/")
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.content)
        self.assertFalse(data["connected"])
        self.assertIsNone(data["provider"])


class AIConnectDisconnectTests(TestCase):
    def test_connect_then_disconnect(self) -> None:
        user = create_user(username="ai2", password="pw")
        c = api_client_bearer(user)
        r = c.post(
            "/api/ai/connect/",
            data={"api_key": "0123456789abcdefghij", "model_name": "gemini-2.5-flash"},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        data = json.loads(r.content)
        self.assertTrue(data["connected"])

        r_del = c.delete("/api/ai/disconnect/")
        self.assertEqual(r_del.status_code, 204)
        self.assertFalse(AIConnection.objects.filter(user=user).exists())


class AIVertexPatchTests(TestCase):
    def test_patch_vertex_service_account(self) -> None:
        user = create_user(username="ai3", password="pw")
        c = api_client_bearer(user)
        r = c.patch(
            "/api/ai/vertex-service-account/",
            data={"service_account_json": _MIN_SA},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        data = json.loads(r.content)
        self.assertTrue(data["vertex_upscaler_configured"])


class AIUpdateModelTests(TestCase):
    def test_update_model_requires_connection(self) -> None:
        user = create_user(username="ai4", password="pw")
        c = api_client_bearer(user)
        r = c.patch(
            "/api/ai/update-model/",
            data={"model_name": "gemini-2.5-flash"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)


class GenerateListingMockTests(TestCase):
    def test_generate_requires_image_when_simple_mode(self) -> None:
        user = create_user(username="ai5", password="pw")
        c = api_client_bearer(user)
        conn, _ = AIConnection.objects.get_or_create(user=user)
        conn.set_api_key("0123456789abcdefghij")
        conn.model_name = "gemini-2.5-flash"
        conn.provider = "gemini"
        conn.is_active = True
        conn.save()

        r = c.post(
            "/api/ai/generate-listing/",
            data={"context": "x"},
            format="multipart",
        )
        self.assertEqual(r.status_code, 400)

    def test_generate_200_with_mock(self) -> None:
        from unittest.mock import MagicMock, patch

        user = create_user(username="ai6", password="pw")
        c = api_client_bearer(user)
        conn, _ = AIConnection.objects.get_or_create(user=user)
        conn.set_api_key("0123456789abcdefghij")
        conn.model_name = "gemini-2.5-flash"
        conn.provider = "gemini"
        conn.is_active = True
        conn.save()

        png = minimal_png_bytes()
        upload = SimpleUploadedFile("p.png", png, content_type="image/png")
        stub = {"title": "T", "tags": ["a"], "description": "D"}

        with patch("ai_integration.views.AIManager") as MockMgr:
            inst = MockMgr.return_value
            inst.generate.return_value = stub
            r = c.post(
                "/api/ai/generate-listing/",
                data={"context": "ctx", "image": upload},
                format="multipart",
            )

        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(json.loads(r.content), stub)
