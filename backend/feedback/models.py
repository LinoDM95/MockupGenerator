from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class FeedbackThread(models.Model):
    """Ein Feedback-Gespräch pro Nutzer; Nachrichten in chronologischer Reihenfolge."""

    class Status(models.TextChoices):
        PENDING = "pending", "Ausstehend"
        IN_PROGRESS = "in_progress", "In Bearbeitung"
        ANSWERED = "answered", "Beantwortet"
        CLOSED = "closed", "Geschlossen"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feedback_threads",
    )
    subject = models.CharField("Betreff", max_length=200, blank=True, default="")
    status = models.CharField(
        "Status",
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    removed_at = models.DateTimeField(
        "Vom Support entfernt am",
        null=True,
        blank=True,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        indexes = [
            models.Index(fields=["user", "-updated_at"]),
        ]

    def __str__(self) -> str:
        sub = (self.subject or "").strip() or "(ohne Betreff)"
        return f"{sub} · {self.user_id}"


class FeedbackMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(
        FeedbackThread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feedback_messages",
    )
    body = models.TextField("Nachricht", max_length=8000)
    is_staff_message = models.BooleanField("Team-Antwort", default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [
            models.Index(fields=["thread", "created_at"]),
        ]


class FeedbackNotification(models.Model):
    """Eingeloggt: Toasts für Antworten, Statusänderungen, Entfernen — bis zur Bestätigung."""

    class Kind(models.TextChoices):
        STAFF_MESSAGE = "staff_message", "Antwort vom Team"
        STATUS_CHANGED = "status_changed", "Status geändert"
        THREAD_REMOVED = "thread_removed", "Feedback entfernt"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feedback_notifications",
    )
    thread = models.ForeignKey(
        FeedbackThread,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    kind = models.CharField(max_length=32, choices=Kind.choices, db_index=True)
    title = models.CharField(max_length=200)
    body = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [
            models.Index(fields=["recipient", "acknowledged_at", "-created_at"]),
        ]
