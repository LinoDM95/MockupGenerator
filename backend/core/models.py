import uuid

from django.conf import settings
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models

from .validators import validate_real_image


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

    FRAME_STYLES = (
        ("none", "none"),
        ("black", "black"),
        ("white", "white"),
        ("wood", "wood"),
    )

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
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"]),
            validate_real_image,
        ],
    )
    order = models.PositiveIntegerField(default=0)
    default_frame_style = models.CharField(
        max_length=16,
        choices=FRAME_STYLES,
        default="none",
        help_text="Standard-Rahmen im Generator, wenn „Vorlagen-Standard“ aktiv ist.",
    )
    frame_shadow_outer_enabled = models.BooleanField(
        default=False,
        help_text="Schatten nach außen am Rahmen (Seiten per Bitmaske).",
    )
    frame_shadow_inner_enabled = models.BooleanField(
        default=False,
        help_text="Schatten/Tiefe ins Motiv (Seiten per Bitmaske).",
    )
    frame_outer_sides = models.PositiveSmallIntegerField(
        default=15,
        validators=[MinValueValidator(0), MaxValueValidator(15)],
        help_text="Außenschatten: Bit 1=oben,2=rechts,4=unten,8=links.",
    )
    frame_inner_sides = models.PositiveSmallIntegerField(
        default=15,
        validators=[MinValueValidator(0), MaxValueValidator(15)],
        help_text="Innenschatten: Bit 1=oben,2=rechts,4=unten,8=links.",
    )
    frame_shadow_depth = models.FloatField(
        default=0.82,
        validators=[MinValueValidator(0.15), MaxValueValidator(1.0)],
        help_text="Stärke/Tiefe (0.15–1): Innenschatten kräftiger; Außenschatten weicher.",
    )
    artwork_saturation = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.15), MaxValueValidator(1.0)],
        help_text="Sättigung des Motivs im Export (1.0 = unverändert, niedriger = dezenter zum Hintergrund).",
    )
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
