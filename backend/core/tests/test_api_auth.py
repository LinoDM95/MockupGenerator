"""Auth endpoints, healthz, register, login, me, change-password."""

from __future__ import annotations

import json

from django.contrib.auth.models import User
from django.test import Client, TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from core.tests.support import api_client_bearer, create_user


class HealthzAndCsrfTests(TestCase):
    def test_healthz_ok(self) -> None:
        c = Client()
        r = c.get("/healthz")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"].split(";")[0].strip(), "text/plain")
        self.assertEqual(r.content.decode(), "ok")

    def test_csrf_bootstrap_returns_token(self) -> None:
        c = Client()
        r = c.get("/api/auth/csrf/")
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.content)
        self.assertIn("csrftoken", data)
        self.assertTrue(data["csrftoken"])


class RegisterTests(TestCase):
    def _post_json(self, path: str, body: dict) -> tuple:
        c = Client(enforce_csrf_checks=True)
        c.get("/api/auth/csrf/")
        token = c.cookies.get("csrftoken")
        self.assertIsNotNone(token)
        return c.post(
            path,
            data=json.dumps(body),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token.value,
        )

    def test_register_201(self) -> None:
        r = self._post_json(
            "/api/auth/register/",
            {"username": "newbie", "password": "securepass1", "email": "n@example.com"},
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newbie").exists())

    def test_register_short_password_400(self) -> None:
        r = self._post_json(
            "/api/auth/register/",
            {"username": "u2", "password": "short"},
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username_400(self) -> None:
        create_user(username="dup", password="testpass123")
        r = self._post_json(
            "/api/auth/register/",
            {"username": "dup", "password": "otherpass9"},
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(TestCase):
    def test_login_sets_cookies(self) -> None:
        create_user(username="logme", password="secretpass9")
        c = Client(enforce_csrf_checks=True)
        c.get("/api/auth/csrf/")
        token = c.cookies["csrftoken"].value
        r = c.post(
            "/api/auth/login/",
            data=json.dumps({"username": "logme", "password": "secretpass9"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("access_token", r.cookies)
        self.assertIn("refresh_token", r.cookies)

    def test_login_invalid_401(self) -> None:
        c = Client(enforce_csrf_checks=True)
        c.get("/api/auth/csrf/")
        token = c.cookies["csrftoken"].value
        r = c.post(
            "/api/auth/login/",
            data=json.dumps({"username": "nope", "password": "wrong"}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


class CurrentUserTests(TestCase):
    def test_me_requires_auth(self) -> None:
        c = APIClient()
        r = c.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_get_ok(self) -> None:
        u = create_user(username="meuser", password="pw", email="me@example.com")
        c = api_client_bearer(u)
        r = c.get("/api/auth/me/")
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.content)
        self.assertEqual(data["username"], "meuser")
        self.assertEqual(data["email"], "me@example.com")

    def test_me_patch_username(self) -> None:
        u = create_user(username="oldname", password="pw")
        c = api_client_bearer(u)
        r = c.patch(
            "/api/auth/me/",
            data={"username": "newname"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.content)
        self.assertEqual(data["username"], "newname")
        u.refresh_from_db()
        self.assertEqual(u.username, "newname")

    def test_me_patch_username_conflict(self) -> None:
        create_user(username="taken", password="pw")
        u = create_user(username="free", password="pw")
        c = api_client_bearer(u)
        r = c.patch(
            "/api/auth/me/",
            data={"username": "taken"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class ChangePasswordTests(TestCase):
    def test_wrong_current_password_400(self) -> None:
        u = create_user(username="cp", password="oldpass123")
        c = api_client_bearer(u)
        r = c.post(
            "/api/auth/change-password/",
            data={"current_password": "nope", "new_password": "newpass123"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_204(self) -> None:
        u = create_user(username="cp2", password="oldpass123")
        c = api_client_bearer(u)
        r = c.post(
            "/api/auth/change-password/",
            data={"current_password": "oldpass123", "new_password": "newpass999"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        u.refresh_from_db()
        self.assertTrue(u.check_password("newpass999"))


class ProtectedApiSmokeTests(TestCase):
    def test_sets_list_401_without_jwt(self) -> None:
        c = APIClient()
        r = c.get("/api/sets/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)
