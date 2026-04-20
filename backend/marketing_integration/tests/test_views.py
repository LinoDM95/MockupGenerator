"""Marketing / Pinterest: Boards ohne Connection; Publish mit Mock."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from django.test import TestCase

from core.tests.support import api_client_bearer, create_user
from marketing_integration.models import SocialPlatform


class PinterestBoardsTests(TestCase):
    def test_boards_400_without_platform(self) -> None:
        user = create_user(username="m1", password="pw")
        c = api_client_bearer(user)
        r = c.get("/api/marketing/boards/")
        self.assertEqual(r.status_code, 400)

    @patch("marketing_integration.views.SocialManager.list_boards")
    def test_boards_200_mocked(self, mock_boards: MagicMock) -> None:
        user = create_user(username="m2", password="pw")
        sp = SocialPlatform.objects.create(
            user=user,
            platform=SocialPlatform.Platform.PINTEREST,
        )
        sp.set_access_token("tok")
        sp.save()
        mock_boards.return_value = [{"id": "b1", "name": "B"}]

        c = api_client_bearer(user)
        r = c.get("/api/marketing/boards/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(json.loads(r.content)["boards"][0]["id"], "b1")


class PinterestPublishTests(TestCase):
    @patch("marketing_integration.views.SocialManager.post_single")
    def test_publish_200_mocked(self, mock_post: MagicMock) -> None:
        user = create_user(username="m3", password="pw")
        sp = SocialPlatform.objects.create(
            user=user,
            platform=SocialPlatform.Platform.PINTEREST,
        )
        sp.set_access_token("tok")
        sp.save()
        mock_post.return_value = {"pin_id": "pin-99"}

        c = api_client_bearer(user)
        r = c.post(
            "/api/marketing/publish-single/",
            data={
                "image_url": "https://example.com/a.png",
                "title": "T",
                "caption": "",
                "destination_url": "https://example.com/",
                "platform": "pinterest",
                "board_id": "b1",
            },
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        body = json.loads(r.content)
        self.assertEqual(body["pin_id"], "pin-99")
