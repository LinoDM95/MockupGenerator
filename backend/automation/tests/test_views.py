"""Automation Jobs: Validierung + 201 mit gemockter Pipeline."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from core.models import TemplateSet
from core.tests.support import api_client_bearer, create_user, minimal_png_bytes


class AutomationJobValidationTests(TestCase):
    def setUp(self) -> None:
        self.user = create_user(username="au1", password="pw")
        self.client = api_client_bearer(self.user)
        self.ts = TemplateSet.objects.create(user=self.user, name="Set")

    def _post(self, **extra):
        png = minimal_png_bytes()
        data = {
            "ai_model_name": "gemini-2.5-flash",
            "mockup_set": str(self.ts.id),
            "gelato_profile": "default",
            "upscale_factor": "4",
            "images": SimpleUploadedFile("m.png", png, content_type="image/png"),
            **extra,
        }
        return self.client.post("/api/automation/jobs/", data=data, format="multipart")

    def test_requires_ai_model(self) -> None:
        r = self._post(ai_model_name="")
        self.assertEqual(r.status_code, 400)

    def test_invalid_mockup_uuid(self) -> None:
        r = self._post(mockup_set="not-a-uuid")
        self.assertEqual(r.status_code, 400)

    def test_mockup_set_other_user(self) -> None:
        other = create_user(username="au2", password="pw")
        foreign = TemplateSet.objects.create(user=other, name="X")
        r = self._post(mockup_set=str(foreign.id))
        self.assertEqual(r.status_code, 400)

    @patch("automation.views.finalize_job")
    @patch("automation.views.process_single_image")
    def test_create_201_with_mocks(self, mock_proc: MagicMock, mock_fin: MagicMock) -> None:
        r = self._post()
        self.assertEqual(r.status_code, 201, r.content)
        body = json.loads(r.content)
        self.assertIn("id", body)
        mock_proc.assert_called()
        mock_fin.assert_called_once()
