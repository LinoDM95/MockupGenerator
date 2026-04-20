"""API-Tests: Feedback-Threads, Nachrichten, Benachrichtigungen, Staff-Rechte."""

from __future__ import annotations

import json

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.tests.support import api_client_bearer, create_user
from feedback.models import FeedbackMessage, FeedbackNotification, FeedbackThread


class FeedbackThreadApiTests(TestCase):
    def test_list_empty(self) -> None:
        u = create_user(username="u1", password="pw")
        c = api_client_bearer(u)
        r = c.get("/api/feedback/threads/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        data = json.loads(r.content)
        self.assertEqual(data["results"], [])

    def test_create_and_list(self) -> None:
        u = create_user(username="u2", password="pw")
        c = api_client_bearer(u)
        r = c.post(
            "/api/feedback/threads/",
            data={"subject": "Hallo", "message": "Erste Nachricht"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        body = json.loads(r.content)
        self.assertEqual(body["subject"], "Hallo")
        self.assertEqual(len(body["messages"]), 1)
        self.assertEqual(body["messages"][0]["body"], "Erste Nachricht")

        r2 = c.get("/api/feedback/threads/")
        self.assertEqual(r2.status_code, 200)
        lst = json.loads(r2.content)["results"]
        self.assertEqual(len(lst), 1)
        self.assertEqual(lst[0]["message_count"], 1)

    def test_user_cannot_see_other_thread(self) -> None:
        a = create_user(username="a", password="pw")
        b = create_user(username="b", password="pw")
        t = FeedbackThread.objects.create(user=a, subject="privat")
        FeedbackMessage.objects.create(thread=t, author=a, body="x", is_staff_message=False)

        c = api_client_bearer(b)
        r = c.get(f"/api/feedback/threads/{t.id}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_follow_up_message(self) -> None:
        u = create_user(username="u3", password="pw")
        t = FeedbackThread.objects.create(user=u, subject="t")
        FeedbackMessage.objects.create(thread=t, author=u, body="start", is_staff_message=False)
        c = api_client_bearer(u)
        r = c.post(
            f"/api/feedback/threads/{t.id}/messages/",
            data={"body": "Nachfrage"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FeedbackMessage.objects.filter(thread=t).count(), 2)

    def test_staff_reply_creates_notification(self) -> None:
        u = create_user(username="cust", password="pw")
        staff = User.objects.create_user(username="agent", password="pw", is_staff=True)
        t = FeedbackThread.objects.create(user=u, subject="q")
        FeedbackMessage.objects.create(thread=t, author=u, body="?", is_staff_message=False)
        c = api_client_bearer(staff)
        r = c.post(
            f"/api/feedback/threads/{t.id}/messages/",
            data={"body": "Antwort vom Team"},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertTrue(
            FeedbackNotification.objects.filter(
                recipient=u,
                kind=FeedbackNotification.Kind.STAFF_MESSAGE,
            ).exists()
        )

    def test_pending_and_ack_notifications(self) -> None:
        u = create_user(username="u4", password="pw")
        t = FeedbackThread.objects.create(user=u, subject="x")
        n = FeedbackNotification.objects.create(
            recipient=u,
            thread=t,
            kind=FeedbackNotification.Kind.STATUS_CHANGED,
            title="Status",
            body="In Bearbeitung",
        )
        c = api_client_bearer(u)
        r = c.get("/api/feedback/notifications/pending/")
        self.assertEqual(r.status_code, 200)
        res = json.loads(r.content)["results"]
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["id"], str(n.id))

        r2 = c.post(
            "/api/feedback/notifications/ack/",
            data={"ids": [str(n.id)]},
            format="json",
        )
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(json.loads(r2.content)["acknowledged"], 1)
        n.refresh_from_db()
        self.assertIsNotNone(n.acknowledged_at)

    def test_staff_patch_status_notifies(self) -> None:
        u = create_user(username="u5", password="pw")
        staff = User.objects.create_user(username="staff2", password="pw", is_staff=True)
        t = FeedbackThread.objects.create(user=u, subject="s")
        c = api_client_bearer(staff)
        r = c.patch(
            f"/api/feedback/threads/{t.id}/",
            data={"status": FeedbackThread.Status.IN_PROGRESS},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(
            FeedbackNotification.objects.filter(
                recipient=u,
                kind=FeedbackNotification.Kind.STATUS_CHANGED,
            ).exists()
        )

    def test_staff_soft_delete_notifies(self) -> None:
        u = create_user(username="u6", password="pw")
        staff = User.objects.create_user(username="staff3", password="pw", is_staff=True)
        t = FeedbackThread.objects.create(user=u, subject="del")
        c = api_client_bearer(staff)
        r = c.delete(f"/api/feedback/threads/{t.id}/")
        self.assertEqual(r.status_code, 204)
        t.refresh_from_db()
        self.assertIsNotNone(t.removed_at)
        self.assertTrue(
            FeedbackNotification.objects.filter(
                recipient=u,
                kind=FeedbackNotification.Kind.THREAD_REMOVED,
            ).exists()
        )
        c_user = api_client_bearer(u)
        r_list = c_user.get("/api/feedback/threads/")
        self.assertEqual(json.loads(r_list.content)["results"], [])

    def test_non_staff_cannot_patch_or_delete(self) -> None:
        u = create_user(username="u7", password="pw")
        t = FeedbackThread.objects.create(user=u, subject="p")
        c = api_client_bearer(u)
        r = c.patch(f"/api/feedback/threads/{t.id}/", data={"status": "closed"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
        r2 = c.delete(f"/api/feedback/threads/{t.id}/")
        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_requires_auth(self) -> None:
        c = APIClient()
        r = c.post(
            "/api/feedback/threads/",
            data={"message": "x"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
