from __future__ import annotations

from django.utils import timezone

from .models import FeedbackMessage, FeedbackNotification, FeedbackThread


def _status_label(thread: FeedbackThread) -> str:
    return str(FeedbackThread.Status(thread.status).label)


def notify_staff_message(message: FeedbackMessage) -> None:
    if not message.is_staff_message:
        return
    thread = message.thread
    FeedbackNotification.objects.create(
        recipient_id=thread.user_id,
        thread=thread,
        kind=FeedbackNotification.Kind.STAFF_MESSAGE,
        title="Neue Antwort auf dein Feedback",
        body=(message.body[:240] + "…") if len(message.body) > 240 else message.body,
    )


def notify_status_changed(thread: FeedbackThread, old: str) -> None:
    if old == thread.status:
        return
    FeedbackNotification.objects.create(
        recipient_id=thread.user_id,
        thread=thread,
        kind=FeedbackNotification.Kind.STATUS_CHANGED,
        title="Status deines Feedbacks wurde aktualisiert",
        body=f"Neuer Status: {_status_label(thread)}",
    )


def notify_thread_removed(thread: FeedbackThread) -> None:
    FeedbackNotification.objects.create(
        recipient_id=thread.user_id,
        thread=thread,
        kind=FeedbackNotification.Kind.THREAD_REMOVED,
        title="Feedback wurde entfernt",
        body="Das Support-Team hat dieses Feedback aus deiner Übersicht entfernt.",
    )
