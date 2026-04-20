"""Gelato API: Status, Connect (mock), Templates leer ohne Connection."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from django.test import TestCase

from core.tests.support import api_client_bearer, create_user
from gelato_integration.models import GelatoConnection


class GelatoStatusTests(TestCase):
    def test_status_disconnected(self) -> None:
        user = create_user(username="g1", password="pw")
        c = api_client_bearer(user)
        r = c.get("/api/gelato/status/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(json.loads(r.content), {"connected": False})


class GelatoConnectMockTests(TestCase):
    @patch("gelato_integration.views.GelatoClient")
    def test_connect_returns_stores(self, mock_cls: MagicMock) -> None:
        user = create_user(username="g2", password="pw")
        c = api_client_bearer(user)
        inst = mock_cls.return_value
        inst.verify_key.return_value = [{"id": "s1", "name": "Shop A"}]
        inst.close = MagicMock()

        r = c.post("/api/gelato/connect/", data={"api_key": "x" * 32}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        body = json.loads(r.content)
        self.assertEqual(len(body["stores"]), 1)
        self.assertTrue(GelatoConnection.objects.filter(user=user).exists())


class GelatoTemplatesTests(TestCase):
    def test_templates_empty_without_active_connection(self) -> None:
        user = create_user(username="g3", password="pw")
        c = api_client_bearer(user)
        r = c.get("/api/gelato/templates/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(json.loads(r.content), [])
