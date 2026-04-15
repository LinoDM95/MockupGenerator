from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class AutomationJob(models.Model):
    """Batch automation run (upscale, SEO, mockups, Gelato, ZIP)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="automation_jobs",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    ai_model_name = models.CharField(max_length=128)
    upscale_factor = models.PositiveSmallIntegerField()  # 2 or 4
    mockup_set = models.CharField(max_length=255)
    gelato_profile = models.CharField(max_length=255)
    result_zip = models.FileField(
        upload_to="automation/results/%Y/%m/",
        blank=True,
        null=True,
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"AutomationJob {self.id} ({self.status})"


class ImageTask(models.Model):
    """Single image pipeline within an AutomationJob."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        UPSCALING = "upscaling", "Upscaling"
        SEO = "seo", "SEO"
        MOCKUPS = "mockups", "Mockups"
        GELATO = "gelato", "Gelato"
        DONE = "done", "Done"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        AutomationJob,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    original_image = models.ImageField(upload_to="automation/uploads/%Y/%m/")
    high_res_image = models.ImageField(
        upload_to="automation/upscaled/%Y/%m/",
        blank=True,
        null=True,
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    error_message = models.TextField(blank=True)
    generated_title = models.CharField(max_length=512, blank=True)
    generated_tags = models.JSONField(default=list, blank=True)
    generated_description = models.TextField(blank=True)
    mockup_paths = models.JSONField(
        default=list,
        blank=True,
        help_text="Relative paths under MEDIA_ROOT for server-rendered mockup PNGs.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"ImageTask {self.id} ({self.status})"
