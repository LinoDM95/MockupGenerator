import uuid

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


class TemplateSet(models.Model):
    """Vorlagen-Set pro Benutzer (entspricht JSON `templateSets[]`)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="template_sets",
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.user_id})"


class Template(models.Model):
    """Einzelne Vorlage mit Hintergrundbild-Datei (kein Base64 in der DB)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template_set = models.ForeignKey(
        TemplateSet,
        on_delete=models.CASCADE,
        related_name="templates",
    )
    name = models.CharField(max_length=255)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    background_image = models.ImageField(
        upload_to="template_backgrounds/%Y/%m/",
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"])],
    )
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["template_set_id", "order", "created_at"]

    def __str__(self) -> str:
        return self.name


class TemplateElement(models.Model):
    """
    Ein Layer/Element; `element_type` entspricht `type` im Frontend.
    Zusätzliche Felder liegen in `payload` (JSON), konsistent mit dem Prototyp.
    """

    ELEMENT_TYPES = (
        ("placeholder", "placeholder"),
        ("text", "text"),
        ("rect", "rect"),
        ("circle", "circle"),
        ("triangle", "triangle"),
        ("star", "star"),
        ("hexagon", "hexagon"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        Template,
        on_delete=models.CASCADE,
        related_name="element_rows",
    )
    order = models.PositiveIntegerField(default=0, db_index=True)
    element_type = models.CharField(max_length=32, choices=ELEMENT_TYPES)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["template_id", "order", "id"]

    def __str__(self) -> str:
        return f"{self.element_type} @ {self.template_id}"
