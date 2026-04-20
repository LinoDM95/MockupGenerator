import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FeedbackThread",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("subject", models.CharField(blank=True, default="", max_length=200, verbose_name="Betreff")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Ausstehend"),
                            ("in_progress", "In Bearbeitung"),
                            ("answered", "Beantwortet"),
                            ("closed", "Geschlossen"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=32,
                        verbose_name="Status",
                    ),
                ),
                (
                    "removed_at",
                    models.DateTimeField(blank=True, db_index=True, null=True, verbose_name="Vom Support entfernt am"),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feedback_threads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ("-updated_at",),
            },
        ),
        migrations.CreateModel(
            name="FeedbackMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("body", models.TextField(max_length=8000, verbose_name="Nachricht")),
                ("is_staff_message", models.BooleanField(db_index=True, default=False, verbose_name="Team-Antwort")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feedback_messages",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "thread",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="feedback.feedbackthread",
                    ),
                ),
            ],
            options={
                "ordering": ("created_at",),
            },
        ),
        migrations.CreateModel(
            name="FeedbackNotification",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("staff_message", "Antwort vom Team"),
                            ("status_changed", "Status geändert"),
                            ("thread_removed", "Feedback entfernt"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("body", models.CharField(blank=True, default="", max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("acknowledged_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                (
                    "recipient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feedback_notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "thread",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to="feedback.feedbackthread",
                    ),
                ),
            ],
            options={
                "ordering": ("created_at",),
            },
        ),
        migrations.AddIndex(
            model_name="feedbackthread",
            index=models.Index(fields=["user", "-updated_at"], name="feedback_fe_user_id_2a8b89_idx"),
        ),
        migrations.AddIndex(
            model_name="feedbackmessage",
            index=models.Index(fields=["thread", "created_at"], name="feedback_fe_thread__aa45b6_idx"),
        ),
        migrations.AddIndex(
            model_name="feedbacknotification",
            index=models.Index(
                fields=["recipient", "acknowledged_at", "-created_at"],
                name="feedback_fe_recipie_0a1b2c_idx",
            ),
        ),
    ]
