# Generated manually for marketing_integration initial models

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
            name="SocialPlatform",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "platform",
                    models.CharField(
                        choices=[("pinterest", "Pinterest")],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("access_token_enc", models.TextField(blank=True)),
                ("refresh_token_enc", models.TextField(blank=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("scopes", models.CharField(blank=True, max_length=512)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="social_platforms",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="SocialPost",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("image_url", models.URLField(max_length=1024)),
                ("title", models.CharField(max_length=512)),
                ("caption", models.TextField(blank=True)),
                ("destination_link", models.URLField(max_length=1024)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Entwurf"),
                            ("posted", "Veröffentlicht"),
                            ("failed", "Fehlgeschlagen"),
                        ],
                        db_index=True,
                        default="draft",
                        max_length=16,
                    ),
                ),
                ("external_pin_id", models.CharField(blank=True, max_length=64)),
                ("last_error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "social_platform",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="posts",
                        to="marketing_integration.socialplatform",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="social_posts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="socialplatform",
            constraint=models.UniqueConstraint(
                fields=("user", "platform"),
                name="uniq_marketing_socialplatform_user_platform",
            ),
        ),
    ]
