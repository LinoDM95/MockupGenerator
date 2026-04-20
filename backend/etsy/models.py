import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from .crypto import decrypt_token, encrypt_token
from .upload_paths import etsy_bulk_asset_upload_to


class EtsyOAuthState(models.Model):
    """PKCE + State vor dem Redirect zu Etsy (kurzlebig)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="etsy_oauth_states",
    )
    state = models.CharField(max_length=128, unique=True, db_index=True)
    code_verifier = models.CharField(max_length=256)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at


class EtsyConnection(models.Model):
    """Pro Benutzer eine Etsy-Verknüpfung inkl. Shop."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="etsy_connection",
    )
    shop_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    etsy_user_id = models.BigIntegerField(null=True, blank=True)
    access_token_enc = models.TextField(blank=True)
    refresh_token_enc = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    scopes = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def set_access_token(self, value: str) -> None:
        self.access_token_enc = encrypt_token(value) if value else ""

    def set_refresh_token(self, value: str) -> None:
        self.refresh_token_enc = encrypt_token(value) if value else ""

    def get_access_token(self) -> str:
        return decrypt_token(self.access_token_enc) if self.access_token_enc else ""

    def get_refresh_token(self) -> str:
        return decrypt_token(self.refresh_token_enc) if self.refresh_token_enc else ""


class EtsyBulkAsset(models.Model):
    """Temporär hochgeladene PNG/JPG für einen Bulk-Job (Phase 1: Client generiert)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="etsy_bulk_assets",
    )
    image = models.ImageField(upload_to=etsy_bulk_asset_upload_to, max_length=512)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class EtsyBulkJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        PARTIAL = "partial", "Partial"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="etsy_bulk_jobs",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    payload = models.JSONField(default=dict)
    result = models.JSONField(null=True, blank=True)
    error_log = models.TextField(blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
