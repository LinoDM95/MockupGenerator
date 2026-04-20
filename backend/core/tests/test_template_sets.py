"""TemplateSet / Template API: CRUD, owner isolation, elements, import mock."""

from __future__ import annotations

import json
import uuid
from io import BytesIO
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status

from core.models import Template, TemplateElement, TemplateSet
from core.tests.support import api_client_bearer, create_user, minimal_png_bytes


class TemplateSetViewSetTests(TestCase):
    def setUp(self) -> None:
        self.user = create_user(username="owner", password="pw")
        self.other = create_user(username="other", password="pw")
        self.client = api_client_bearer(self.user)

    def test_list_empty(self) -> None:
        r = self.client.get("/api/sets/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(json.loads(r.content), [])

    def test_create_and_retrieve(self) -> None:
        r = self.client.post("/api/sets/", data={"name": "My Set"}, format="json")
        self.assertEqual(r.status_code, 201)
        data = json.loads(r.content)
        pk = data["id"]
        self.assertEqual(data["name"], "My Set")

        r2 = self.client.get(f"/api/sets/{pk}/")
        self.assertEqual(r2.status_code, 200)
        body = json.loads(r2.content)
        self.assertEqual(body["name"], "My Set")
        self.assertEqual(body["templates"], [])

    def test_other_user_cannot_retrieve(self) -> None:
        ts = TemplateSet.objects.create(user=self.user, name="Private")
        c2 = api_client_bearer(self.other)
        r = c2.get(f"/api/sets/{ts.pk}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_set_name(self) -> None:
        ts = TemplateSet.objects.create(user=self.user, name="Old")
        r = self.client.patch(f"/api/sets/{ts.pk}/", data={"name": "New"}, format="json")
        self.assertEqual(r.status_code, 200)
        ts.refresh_from_db()
        self.assertEqual(ts.name, "New")


class TemplateElementsTests(TestCase):
    def setUp(self) -> None:
        self.user = create_user(username="t1", password="pw")
        self.client = api_client_bearer(self.user)
        self.ts = TemplateSet.objects.create(user=self.user, name="S")
        png = minimal_png_bytes()
        self.tpl = Template.objects.create(
            template_set=self.ts,
            name="T1",
            width=1,
            height=1,
            background_image=SimpleUploadedFile("bg.png", png, content_type="image/png"),
            order=0,
        )

    def test_replace_elements_put(self) -> None:
        payload = [
            {
                "id": str(uuid.uuid4()),
                "type": "text",
                "x": 10,
                "text": "Hi",
            },
        ]
        r = self.client.put(
            f"/api/templates/{self.tpl.pk}/elements/",
            data=payload,
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.content)
        self.assertEqual(len(body["elements"]), 1)
        self.assertEqual(body["elements"][0]["type"], "text")

    def test_replace_elements_invalid_body_400(self) -> None:
        r = self.client.put(
            f"/api/templates/{self.tpl.pk}/elements/",
            data={"not": "array"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_user_cannot_replace_elements(self) -> None:
        other = create_user(username="o2", password="pw")
        c2 = api_client_bearer(other)
        r = c2.put(
            f"/api/templates/{self.tpl.pk}/elements/",
            data=[],
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)


class AddTemplateActionTests(TestCase):
    def setUp(self) -> None:
        self.user = create_user(username="at", password="pw")
        self.client = api_client_bearer(self.user)
        self.ts = TemplateSet.objects.create(user=self.user, name="S")

    def test_add_template_multipart(self) -> None:
        png = minimal_png_bytes()
        upload = SimpleUploadedFile("bg.png", png, content_type="image/png")
        r = self.client.post(
            f"/api/sets/{self.ts.pk}/templates/",
            data={
                "background_image": upload,
                "name": "Layer",
                "elements": json.dumps([]),
            },
            format="multipart",
        )
        self.assertEqual(r.status_code, 201)
        body = json.loads(r.content)
        self.assertEqual(body["name"], "Layer")
        self.assertEqual(body["width"], 1)
        self.assertEqual(body["height"], 1)

    def test_add_template_requires_image(self) -> None:
        r = self.client.post(
            f"/api/sets/{self.ts.pk}/templates/",
            data={"name": "x"},
            format="multipart",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class ImportSetTests(TestCase):
    def setUp(self) -> None:
        self.user = create_user(username="im", password="pw")
        self.client = api_client_bearer(self.user)

    def test_import_invalid_body_400(self) -> None:
        r = self.client.post("/api/sets/import/", data="[]", content_type="application/json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("core.views.httpx.get")
    def test_import_downloads_same_origin(self, mock_get: MagicMock) -> None:
        png = minimal_png_bytes()
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.content = png
        mock_get.return_value = mock_resp

        body = {
            "name": "Imported",
            "templates": [
                {
                    "name": "A",
                    "bgImage": "/media/x/y.png",
                    "elements": [],
                },
            ],
        }
        r = self.client.post("/api/sets/import/", data=body, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        data = json.loads(r.content)
        self.assertEqual(data["name"], "Imported")
        self.assertEqual(len(data["templates"]), 1)
        mock_get.assert_called_once()


class ExportSetTests(TestCase):
    def setUp(self) -> None:
        self.user = create_user(username="ex", password="pw")
        self.client = api_client_bearer(self.user)
        self.ts = TemplateSet.objects.create(user=self.user, name="E")

    def test_export_set(self) -> None:
        r = self.client.get(f"/api/sets/{self.ts.pk}/export/")
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.content)
        self.assertEqual(data["name"], "E")
