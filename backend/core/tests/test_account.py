"""Konto: E-Mail ändern, Datenexport, Kontolöschung."""

from __future__ import annotations

import json

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status

from core.models import TemplateSet
from core.tests.support import api_client_bearer, create_user


class UserMeExtendedTests(TestCase):
    def test_me_includes_dates(self) -> None:
        u = create_user(username="meta", password="pw", email="m@example.com")
        c = api_client_bearer(u)
        r = c.get("/api/auth/me/")
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.content)
        self.assertIn("date_joined", data)
        self.assertIn("last_login", data)

    def test_patch_email(self) -> None:
        u = create_user(username="em1", password="pw", email="old@example.com")
        c = api_client_bearer(u)
        r = c.patch(
            "/api/auth/me/",
            data={"email": "New@Example.com"},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        data = json.loads(r.content)
        self.assertEqual(data["email"], "new@example.com")
        u.refresh_from_db()
        self.assertEqual(u.email, "new@example.com")

    def test_patch_email_duplicate_400(self) -> None:
        create_user(username="other", password="pw", email="taken@example.com")
        u = create_user(username="self", password="pw", email="mine@example.com")
        c = api_client_bearer(u)
        r = c.patch(
            "/api/auth/me/",
            data={"email": "Taken@Example.com"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


class AccountDataExportTests(TestCase):
    def test_export_shape(self) -> None:
        u = create_user(username="ex", password="pw")
        TemplateSet.objects.create(user=u, name="S1")
        c = api_client_bearer(u)
        r = c.get("/api/auth/me/export/")
        self.assertEqual(r.status_code, 200)
        data = json.loads(r.content)
        self.assertEqual(data["export_version"], 1)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["username"], "ex")
        self.assertEqual(len(data["template_sets"]), 1)
        self.assertEqual(data["template_sets"][0]["name"], "S1")


class DeleteAccountTests(TestCase):
    def test_delete_wrong_password_400(self) -> None:
        u = create_user(username="del1", password="rightpass9")
        c = api_client_bearer(u)
        r = c.post(
            "/api/auth/delete-account/",
            data={"password": "wrong", "confirm_username": "del1"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=u.pk).exists())

    def test_delete_wrong_username_confirm_400(self) -> None:
        u = create_user(username="del2", password="pw123456")
        c = api_client_bearer(u)
        r = c.post(
            "/api/auth/delete-account/",
            data={"password": "pw123456", "confirm_username": "del2_typo"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=u.pk).exists())

    def test_delete_success_204(self) -> None:
        u = create_user(username="del3", password="pw123456")
        uid = u.pk
        c = api_client_bearer(u)
        r = c.post(
            "/api/auth/delete-account/",
            data={"password": "pw123456", "confirm_username": "del3"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=uid).exists())
