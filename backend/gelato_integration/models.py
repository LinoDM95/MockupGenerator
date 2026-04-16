import uuid

from django.conf import settings
from django.db import models

from core.crypto import decrypt_token, encrypt_token


class GelatoConnection(models.Model):
    """Per-user Gelato API connection (API-key auth, no OAuth)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gelato_connection",
    )
    api_key_enc = models.TextField(blank=True)
    store_id = models.CharField(max_length=128, blank=True)
    store_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Gelato – {self.user} ({self.store_name or 'kein Store'})"

    def set_api_key(self, plain: str) -> None:
        self.api_key_enc = encrypt_token(plain) if plain else ""

    def get_api_key(self) -> str:
        return decrypt_token(self.api_key_enc) if self.api_key_enc else ""


class GelatoTemplate(models.Model):
    """A product template from the Gelato catalog, synced per-connection."""

    connection = models.ForeignKey(
        GelatoConnection,
        on_delete=models.CASCADE,
        related_name="templates",
    )
    gelato_template_id = models.CharField(max_length=255)
    name = models.CharField(max_length=512)
    preview_url = models.URLField(max_length=1024, blank=True)
    is_active = models.BooleanField(default=True)
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("connection", "gelato_template_id")]

    def __str__(self) -> str:
        return self.name


class GelatoExportTask(models.Model):
    """Tracks a single design -> Gelato product creation."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gelato_export_tasks",
    )
    gelato_template = models.ForeignKey(
        GelatoTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_tasks",
    )
    design_image = models.ImageField(
        upload_to="gelato_exports/%Y/%m/", blank=True, null=True,
    )
    artwork_r2_url = models.URLField(max_length=1024, blank=True)
    mockup_r2_url = models.URLField(max_length=1024, blank=True)
    title = models.CharField(max_length=512, blank=True)
    description = models.TextField(blank=True)
    tags = models.CharField(max_length=1024, blank=True)
    free_shipping = models.BooleanField(default=False)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    gelato_product_id = models.CharField(max_length=255, blank=True)
    gelato_product_uid = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Export {self.id} – {self.status}"


def _r2_storage():
    """Lazy accessor for the named 'r2' storage backend."""
    from django.core.files.storage import storages
    return storages["r2"]


class TemporaryDesignUpload(models.Model):
    """Short-lived image stored on Cloudflare R2 for Gelato product creation.

    Cleaned up after R2_TEMP_DESIGN_MAX_AGE_HOURS (default 24) via
    R2TempCleanupMiddleware (API traffic), Gelato upload hook, or
    ``manage.py cleanup_r2_temp_designs``; optional Celery task with same logic.
    """

    image = models.ImageField(upload_to="temp_designs/", storage=_r2_storage)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return f"TempDesign {self.pk} – {self.image.name}"

    @property
    def public_url(self) -> str:
        domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", "")
        if domain and self.image and self.image.name:
            return f"https://{domain}/{self.image.name}"
        if self.image:
            return self.image.url
        return ""
