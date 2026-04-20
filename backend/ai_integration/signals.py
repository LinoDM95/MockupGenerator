"""Beim User-Anlegen eine AIConnection vorhalten — vermeidet Race bei parallelem get_or_create."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AIConnection

User = get_user_model()


@receiver(post_save, sender=User)
def create_ai_connection_for_new_user(
    sender,
    instance,
    created,
    **kwargs,
):
    if created:
        AIConnection.objects.get_or_create(user=instance)
