"""Integrations status GET (Cache) und Invalidierung nach Save."""

from __future__ import annotations

import json

from django.core.cache import cache
from django.test import TestCase, override_settings

from core.tests.support import api_client_bearer, create_user
from etsy.models import EtsyConnection


@override_settings(INTEGRATIONS_STATUS_CACHE_SECONDS=600)
class IntegrationsStatusCacheTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user = create_user(username="int1", password="pw")
        self.client = api_client_bearer(self.user)

    def test_get_shape_defaults(self) -> None:
        r = self.client.get("/api/settings/integrations/")
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.content)
        for key in (
            "etsy",
            "gemini",
            "gelato",
            "vertex",
            "cloudflare_r2",
            "pinterest",
        ):
            self.assertIn(key, data)
            self.assertIsInstance(data[key], bool)

    def test_second_get_uses_cache(self) -> None:
        r1 = self.client.get("/api/settings/integrations/")
        EtsyConnection.objects.create(user=self.user)
        r2 = self.client.get("/api/settings/integrations/")
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
        self.assertFalse(json.loads(r1.content)["etsy"])
        self.assertFalse(json.loads(r2.content)["etsy"])

    def test_save_invalidates_cache(self) -> None:
        r1 = self.client.get("/api/settings/integrations/")
        self.assertFalse(json.loads(r1.content)["gemini"])
        r_save = self.client.post(
            "/api/settings/integrations/save/",
            data={
                "integration": "gemini",
                "payload": {"api_key": "0123456789ab"},
            },
            format="json",
        )
        self.assertEqual(r_save.status_code, 200, r_save.content)
        r2 = self.client.get("/api/settings/integrations/")
        self.assertTrue(json.loads(r2.content)["gemini"])
