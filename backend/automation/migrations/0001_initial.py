# Generated manually for automation app

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AutomationJob",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("processing", "Processing"), ("completed", "Completed"), ("failed", "Failed")], db_index=True, default="pending", max_length=16)),
                ("ai_model_name", models.CharField(max_length=128)),
                ("upscale_factor", models.PositiveSmallIntegerField()),
                ("mockup_set", models.CharField(max_length=255)),
                ("gelato_profile", models.CharField(max_length=255)),
                ("result_zip", models.FileField(blank=True, null=True, upload_to="automation/results/%Y/%m/")),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="automation_jobs", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ImageTask",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("original_image", models.ImageField(upload_to="automation/uploads/%Y/%m/")),
                ("high_res_image", models.ImageField(blank=True, null=True, upload_to="automation/upscaled/%Y/%m/")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("upscaling", "Upscaling"), ("seo", "SEO"), ("mockups", "Mockups"), ("gelato", "Gelato"), ("done", "Done"), ("error", "Error")], db_index=True, default="pending", max_length=16)),
                ("error_message", models.TextField(blank=True)),
                ("generated_title", models.CharField(blank=True, max_length=512)),
                ("generated_tags", models.JSONField(blank=True, default=list)),
                ("generated_description", models.TextField(blank=True)),
                ("mockup_paths", models.JSONField(blank=True, default=list, help_text="Relative paths under MEDIA_ROOT for server-rendered mockup PNGs.")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("job", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="tasks", to="automation.automationjob")),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
    ]
