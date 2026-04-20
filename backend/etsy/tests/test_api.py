"""Etsy: API-Integrationstests (gemockte externe Aufrufe)."""

from __future__ import annotations

import json
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
from django.utils import timezone

from core.tests.support import api_client_bearer, create_user

from ..models import EtsyConnection, EtsyOAuthState


class EtsyOAuthApiTests(TestCase):
    @override_settings(ETSY_CLIENT_ID="", ETSY_REDIRECT_URI="")
    def test_oauth_start_503_without_config(self) -> None:
        user = create_user(username="e_oauth", password="pw")
        c = api_client_bearer(user)
        r = c.get("/api/etsy/oauth/start/")
        self.assertEqual(r.status_code, 503)

    @override_settings(ETSY_CLIENT_ID="cid", ETSY_REDIRECT_URI="http://127.0.0.1/cb", ETSY_SCOPES="a b")
    @patch("etsy.views.EtsyOpenApiClient")
    @patch("etsy.views.exchange_authorization_code")
    def test_oauth_callback_ok_mocked(self, mock_exchange: MagicMock, mock_client_cls: MagicMock) -> None:
        user = create_user(username="e_cb", password="pw")
        c = api_client_bearer(user)
        EtsyOAuthState.objects.create(
            user=user,
            state="st1",
            code_verifier="verifier" * 4,
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        mock_exchange.return_value = {
            "access_token": "at",
            "refresh_token": "rt",
            "expires_in": 3600,
        }
        inst = mock_client_cls.return_value
        inst.get_json.side_effect = [
            {"user_id": 42},
            {"results": [{"shop_id": 7}]},
        ]
        inst.close = MagicMock()

        r = c.post(
            "/api/etsy/oauth/callback/",
            data={"code": "c1", "state": "st1"},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        body = json.loads(r.content)
        self.assertTrue(body.get("ok"))
        conn = EtsyConnection.objects.get(user=user)
        self.assertEqual(conn.shop_id, 7)


class EtsyListingsApiTests(TestCase):
    @patch("etsy.views.EtsyOpenApiClient")
    @patch("etsy.views.ensure_fresh_access_token", return_value="tok")
    def test_listings_returns_results(self, _mock_tok: MagicMock, mock_cls: MagicMock) -> None:
        user = create_user(username="e_lst", password="pw")
        conn = EtsyConnection.objects.create(user=user)
        conn.set_access_token("x")
        conn.shop_id = 99
        conn.save()

        inst = mock_cls.return_value
        inst.get_json.side_effect = [
            {"count": 1, "results": [{"listing_id": 1}]},
            {"results": []},
        ]
        inst.close = MagicMock()

        c = api_client_bearer(user)
        r = c.get("/api/etsy/listings/")
        self.assertEqual(r.status_code, 200)
        body = json.loads(r.content)
        self.assertEqual(len(body["results"]), 1)

    def test_listings_400_without_connection(self) -> None:
        user = create_user(username="e_nc", password="pw")
        c = api_client_bearer(user)
        r = c.get("/api/etsy/listings/")
        self.assertEqual(r.status_code, 400)


class EtsyBulkJobApiTests(TestCase):
    @patch("etsy.views.process_etsy_bulk_job.delay")
    def test_bulk_job_202_mocked_celery(self, mock_delay: MagicMock) -> None:
        mock_delay.return_value = MagicMock(id="task-id")
        user = create_user(username="e_bj", password="pw")
        conn = EtsyConnection.objects.create(user=user)
        conn.shop_id = 1
        conn.set_access_token("t")
        conn.save()

        c = api_client_bearer(user)
        r = c.post(
            "/api/etsy/bulk-jobs/",
            data={"items": [{"listing_id": 5, "deletes": [1]}]},
            format="json",
        )
        self.assertEqual(r.status_code, 202, r.content)
        mock_delay.assert_called_once()
