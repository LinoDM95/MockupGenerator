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
            name="UserIntegration",
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
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_integration",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("gemini_api_key_enc", models.TextField(blank=True)),
                ("gelato_api_key_enc", models.TextField(blank=True)),
                ("cloudflare_access_key_enc", models.TextField(blank=True)),
                ("cloudflare_secret_key_enc", models.TextField(blank=True)),
                ("cloudflare_endpoint", models.CharField(blank=True, max_length=512)),
                ("cloudflare_bucket_name", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
